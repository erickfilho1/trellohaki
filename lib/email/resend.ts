import { Resend } from "resend";

export const resendApiKey = process.env.RESEND_API_KEY;

let resendClient: Resend | null = null;

export function getResendClient() {
  if (!resendApiKey) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(resendApiKey);
  }

  return resendClient;
}

export const resendFromEmail =
  process.env.RESEND_FROM_EMAIL || "Painel Haki <onboarding@resend.dev>";
