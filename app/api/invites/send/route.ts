import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { buildInviteEmailHtml, buildInviteEmailSubject } from "@/lib/email/invite-template";
import { resend, resendFromEmail } from "@/lib/email/resend";

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
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

  if (!token) {
    return NextResponse.json({ error: "Sessao ausente para enviar convite." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nao esta configurado no servidor." }, { status: 500 });
  }

  const { data, error: userError } = await supabase.auth.getUser(token);
  const requesterEmail = data.user?.email?.trim().toLowerCase();

  if (userError || requesterEmail !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Somente o admin pode enviar convites." }, { status: 403 });
  }

  const payload = (await request.json()) as Partial<InviteSendPayload>;
  if (!isValidInvitePayload(payload)) {
    return NextResponse.json({ error: "Dados do convite incompletos." }, { status: 400 });
  }

  if (!resend) {
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
    return NextResponse.json({ error: emailError.message }, { status: 400 });
  }

  return NextResponse.json({ id: emailData?.id ?? null });
}
