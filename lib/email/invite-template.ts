type InviteEmailPayload = {
  recipientName: string;
  boardName: string;
  inviteLink: string;
  accessKind: "cliente" | "colaborador";
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildInviteEmailSubject(boardName: string) {
  return `Seu acesso ao painel ${boardName} esta pronto`;
}

export function buildInviteEmailHtml({
  recipientName,
  boardName,
  inviteLink,
  accessKind,
}: InviteEmailPayload) {
  const safeName = escapeHtml(recipientName || "novo acesso");
  const safeBoardName = escapeHtml(boardName);
  const safeInviteLink = escapeHtml(inviteLink);
  const panelLabel = accessKind === "colaborador" ? "Painel colaborador" : "Painel cliente";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${buildInviteEmailSubject(safeBoardName)}</title>
  </head>
  <body style="margin:0;background:#0b0b0b;font-family:Arial,Helvetica,sans-serif;color:#f7f9ff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0b0b0b 0%,#111111 52%,#160d0d 100%);padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;border:1px solid rgba(255,255,255,.12);border-radius:28px;background:#111111;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.45);">
            <tr>
              <td style="padding:28px 30px;border-bottom:1px solid rgba(255,255,255,.08);">
                <div style="display:inline-block;border-radius:999px;background:rgba(255,91,78,.13);border:1px solid rgba(255,122,112,.28);padding:8px 12px;color:#ffc7c1;font-size:12px;letter-spacing:.18em;text-transform:uppercase;">${panelLabel}</div>
                <h1 style="margin:22px 0 0;font-size:34px;line-height:1.04;letter-spacing:-.04em;color:#ffffff;">Seu acesso ao Painel Haki esta pronto.</h1>
                <p style="margin:16px 0 0;color:#aab6cc;font-size:16px;line-height:1.65;">${safeName}, seu email foi liberado para entrar no quadro <strong style="color:#fff;">${safeBoardName}</strong>.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 30px;">
                <div style="border-radius:22px;background:#0c121d;border:1px solid rgba(255,255,255,.08);padding:20px;">
                  <p style="margin:0;color:#8795b0;font-size:13px;letter-spacing:.16em;text-transform:uppercase;">Proximo passo</p>
                  <p style="margin:10px 0 0;color:#dce6fb;font-size:16px;line-height:1.6;">Clique no botao abaixo para criar seu acesso. O link ja abre com o email vinculado ao quadro certo.</p>
                  <a href="${safeInviteLink}" style="display:inline-block;margin-top:20px;border-radius:16px;background:#557dff;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 22px;">Criar acesso agora</a>
                </div>
                <p style="margin:22px 0 0;color:#7f8ca6;font-size:13px;line-height:1.6;">Se o botao nao funcionar, copie e cole este link no navegador:</p>
                <p style="margin:8px 0 0;word-break:break-all;color:#b9c8ff;font-size:13px;line-height:1.6;">${safeInviteLink}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
