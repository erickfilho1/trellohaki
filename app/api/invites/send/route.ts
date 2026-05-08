import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { buildInviteEmailHtml, buildInviteEmailSubject } from "@/lib/email/invite-template";
import { getResendClient, resendFromEmail } from "@/lib/email/resend";
import { errorMessage, logError, logInfo, logWarn } from "@/lib/monitoring/logger";

const ADMIN_EMAIL = "erickfilho281@gmail.com";

type InviteSendPayload = {
  to: string;
  recipientName: string;
  boardName: string;
  inviteLink: string;
  accessKind: "cliente" | "colaborador";
};

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidInvitePayload(payload: Partial<InviteSendPayload>): payload is InviteSendPayload {
  return Boolean(
    payload.to &&
      payload.recipientName &&
      payload.boardName &&
      payload.inviteLink &&
      (payload.accessKind === "cliente" || payload.accessKind === "colaborador") &&
      isValidEmail(payload.to),
  );
}

export async function POST(request: Request) {
  const start = Date.now();
  const route = "/api/invites/send";
  const requestId = request.headers.get("x-vercel-id");

  try {
    logInfo({
      message: "invite_email_start",
      route,
      requestId,
    });

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

  if (!token) {
    logWarn({
      message: "invite_email_missing_session",
      route,
      requestId,
      durationMs: Date.now() - start,
    });
    return NextResponse.json({ error: "Sessao ausente para enviar convite." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    logError({
      message: "invite_email_supabase_env_missing",
      route,
      requestId,
      durationMs: Date.now() - start,
    });
    return NextResponse.json({ error: "Supabase nao esta configurado no servidor." }, { status: 500 });
  }

  const { data, error: userError } = await supabase.auth.getUser(token);
  const requesterEmail = data.user?.email?.trim().toLowerCase();

  if (userError || requesterEmail !== ADMIN_EMAIL) {
    logWarn({
      message: "invite_email_forbidden",
      route,
      requestId,
      requesterEmail: requesterEmail ?? null,
      supabaseError: userError?.message ?? null,
      durationMs: Date.now() - start,
    });
    return NextResponse.json({ error: "Somente o admin pode enviar convites." }, { status: 403 });
  }

  const payload = (await request.json()) as Partial<InviteSendPayload>;
  if (!isValidInvitePayload(payload)) {
    logWarn({
      message: "invite_email_invalid_payload",
      route,
      requestId,
      to: payload.to ?? null,
      durationMs: Date.now() - start,
    });
    return NextResponse.json({ error: "Dados do convite incompletos." }, { status: 400 });
  }

  const resend = getResendClient();
  if (!resend) {
    logWarn({
      message: "invite_email_resend_missing",
      route,
      requestId,
      to: payload.to,
      durationMs: Date.now() - start,
    });
    return NextResponse.json(
      {
        error:
          "RESEND_API_KEY ainda nao esta configurada. O convite foi preparado, mas o email real nao saiu.",
      },
      { status: 503 },
    );
  }

  const { data: emailData, error: emailError } = await resend.emails.send(
    {
      from: resendFromEmail,
      to: payload.to.trim().toLowerCase(),
      subject: buildInviteEmailSubject(payload.boardName),
      html: buildInviteEmailHtml(payload),
    },
    {
      headers: {
        "Idempotency-Key": `clientboard-invite-${payload.to.trim().toLowerCase()}-${payload.boardName}`,
      },
    },
  );

  if (emailError) {
    logError({
      message: "invite_email_resend_failed",
      route,
      requestId,
      to: payload.to,
      error: emailError.message,
      durationMs: Date.now() - start,
    });
    return NextResponse.json({ error: emailError.message }, { status: 400 });
  }

  logInfo({
    message: "invite_email_sent",
    route,
    requestId,
    to: payload.to,
    emailId: emailData?.id ?? null,
    durationMs: Date.now() - start,
  });

    return NextResponse.json({ id: emailData?.id ?? null });
  } catch (error) {
    logError({
      message: "invite_email_unhandled_error",
      route,
      requestId,
      error: errorMessage(error),
      durationMs: Date.now() - start,
    });

    return NextResponse.json({ error: "Nao foi possivel enviar o convite agora." }, { status: 500 });
  }
}
