import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { buildWelcomeEmailHtml, buildWelcomeEmailSubject } from "@/lib/email/invite-template";
import { getResendClient, resendFromEmail } from "@/lib/email/resend";
import { errorMessage, logError, logInfo, logWarn } from "@/lib/monitoring/logger";

type WelcomeSendPayload = {
  to: string;
  recipientName: string;
  boardName: string;
  accessLink: string;
  accessKind: "cliente" | "colaborador";
};

function getSupabaseServerClient(accessToken?: string) {
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
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPayload(payload: Partial<WelcomeSendPayload>): payload is WelcomeSendPayload {
  return Boolean(
    payload.to &&
      payload.recipientName &&
      payload.boardName &&
      payload.accessLink &&
      (payload.accessKind === "cliente" || payload.accessKind === "colaborador") &&
      isValidEmail(payload.to),
  );
}

export async function POST(request: Request) {
  const start = Date.now();
  const route = "/api/welcome/send";
  const requestId = request.headers.get("x-vercel-id");

  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    if (!token) {
      logWarn({ message: "welcome_email_missing_session", route, requestId, durationMs: Date.now() - start });
      return NextResponse.json({ error: "Sessao ausente para enviar email de boas-vindas." }, { status: 401 });
    }

    const supabase = getSupabaseServerClient(token);
    if (!supabase) {
      logError({ message: "welcome_email_supabase_env_missing", route, requestId, durationMs: Date.now() - start });
      return NextResponse.json({ error: "Supabase nao esta configurado no servidor." }, { status: 500 });
    }

    const payload = (await request.json()) as Partial<WelcomeSendPayload>;
    if (!isValidPayload(payload)) {
      logWarn({ message: "welcome_email_invalid_payload", route, requestId, durationMs: Date.now() - start });
      return NextResponse.json({ error: "Dados do email de boas-vindas incompletos." }, { status: 400 });
    }

    const { data, error: userError } = await supabase.auth.getUser(token);
    const authUser = data.user;
    const requesterEmail = normalizeEmail(authUser?.email ?? "");
    const targetEmail = normalizeEmail(payload.to);

    if (userError || !authUser || requesterEmail !== targetEmail) {
      logWarn({
        message: "welcome_email_forbidden",
        route,
        requestId,
        requesterEmail: requesterEmail || null,
        targetEmail,
        supabaseError: userError?.message ?? null,
        durationMs: Date.now() - start,
      });
      return NextResponse.json({ error: "Sem permissao para enviar boas-vindas." }, { status: 403 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, welcome_email_sent_at")
      .eq("id", authUser.id)
      .maybeSingle<{ id: string; email: string; welcome_email_sent_at: string | null }>();

    if (profileError) {
      logError({
        message: "welcome_email_profile_lookup_failed",
        route,
        requestId,
        targetEmail,
        error: profileError.message,
        durationMs: Date.now() - start,
      });
      return NextResponse.json({ error: "Nao foi possivel validar o perfil para o envio." }, { status: 500 });
    }

    if (!profile) {
      logWarn({ message: "welcome_email_profile_missing", route, requestId, targetEmail, durationMs: Date.now() - start });
      return NextResponse.json({ error: "Perfil nao encontrado para concluir o fluxo." }, { status: 404 });
    }

    if (profile.welcome_email_sent_at) {
      return NextResponse.json({ ok: true, alreadySent: true });
    }

    const resend = getResendClient();
    if (!resend) {
      logWarn({ message: "welcome_email_resend_missing", route, requestId, targetEmail, durationMs: Date.now() - start });
      return NextResponse.json(
        { error: "RESEND_API_KEY ainda nao esta configurada para enviar o boas-vindas." },
        { status: 503 },
      );
    }

    const { data: emailData, error: emailError } = await resend.emails.send(
      {
        from: resendFromEmail,
        to: targetEmail,
        subject: buildWelcomeEmailSubject(payload.boardName),
        html: buildWelcomeEmailHtml(payload),
      },
      {
        headers: {
          "Idempotency-Key": `painel-haki-welcome-${authUser.id}-${targetEmail}`,
        },
      },
    );

    if (emailError) {
      logError({
        message: "welcome_email_resend_failed",
        route,
        requestId,
        targetEmail,
        error: emailError.message,
        durationMs: Date.now() - start,
      });
      return NextResponse.json({ error: emailError.message }, { status: 400 });
    }

    const { error: markError } = await supabase
      .from("profiles")
      .update({
        welcome_email_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", authUser.id)
      .is("welcome_email_sent_at", null);

    if (markError) {
      logWarn({
        message: "welcome_email_mark_sent_failed",
        route,
        requestId,
        targetEmail,
        error: markError.message,
        durationMs: Date.now() - start,
      });
    }

    logInfo({
      message: "welcome_email_sent",
      route,
      requestId,
      targetEmail,
      emailId: emailData?.id ?? null,
      durationMs: Date.now() - start,
    });

    return NextResponse.json({ ok: true, id: emailData?.id ?? null });
  } catch (error) {
    logError({
      message: "welcome_email_unhandled_error",
      route,
      requestId,
      error: errorMessage(error),
      durationMs: Date.now() - start,
    });

    return NextResponse.json({ error: "Nao foi possivel enviar o email de boas-vindas agora." }, { status: 500 });
  }
}
