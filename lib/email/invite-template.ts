type InviteEmailPayload = {
  recipientName: string;
  boardName: string;
  inviteLink: string;
  accessKind: "cliente" | "colaborador";
};

type WelcomeEmailPayload = {
  recipientName: string;
  boardName: string;
  accessLink: string;
  accessKind: "cliente" | "colaborador";
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function panelTone(accessKind: "cliente" | "colaborador") {
  return accessKind === "colaborador"
    ? {
        badge: "Painel colaborador",
        eyebrow: "Fluxo operacional liberado",
        subtitle: "Seu acesso foi aprovado para acompanhar demandas, comentários e entregas.",
      }
    : {
        badge: "Painel cliente",
        eyebrow: "Acesso ao workspace liberado",
        subtitle: "Seu painel foi preparado para acompanhar prioridades, aprovacoes e entregas.",
      };
}

function buildEmailShell({
  title,
  eyebrow,
  badge,
  intro,
  body,
  actionLabel,
  actionHref,
  actionHint,
}: {
  title: string;
  eyebrow: string;
  badge: string;
  intro: string;
  body: string;
  actionLabel: string;
  actionHref: string;
  actionHint: string;
}) {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;background:#070707;font-family:Arial,Helvetica,sans-serif;color:#f7f7f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:radial-gradient(circle at top left, rgba(230,61,47,0.22), transparent 28%),linear-gradient(145deg,#070707 0%,#0b0b0b 42%,#151010 100%);padding:34px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;overflow:hidden;border-radius:30px;border:1px solid rgba(255,255,255,0.1);background:#0d0d0d;box-shadow:0 34px 90px rgba(0,0,0,0.48);">
            <tr>
              <td style="padding:26px 28px 22px;border-bottom:1px solid rgba(255,255,255,0.08);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left" style="padding-bottom:18px;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width:44px;height:44px;border-radius:14px;background:linear-gradient(180deg,#151515 0%,#0c0c0c 100%);border:1px solid rgba(255,255,255,0.08);box-shadow:inset 0 1px 0 rgba(255,255,255,0.06);" align="center" valign="middle">
                            <span style="display:inline-block;font-size:23px;line-height:1;color:#ff5d48;font-weight:700;">H</span>
                          </td>
                          <td style="padding-left:12px;">
                            <div style="font-size:20px;line-height:1.1;font-weight:700;color:#ffffff;">Studio Haki</div>
                            <div style="margin-top:5px;font-size:12px;line-height:1.4;letter-spacing:.16em;text-transform:uppercase;color:#7e7b76;">${eyebrow}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div style="display:inline-block;border-radius:999px;border:1px solid rgba(255,110,89,0.3);background:rgba(115,28,20,0.42);padding:8px 12px;font-size:11px;line-height:1;letter-spacing:.18em;text-transform:uppercase;color:#ffc0b7;">${badge}</div>
                      <h1 style="margin:18px 0 0;font-size:36px;line-height:1.04;letter-spacing:-.05em;color:#ffffff;font-weight:700;">${intro}</h1>
                      <p style="margin:16px 0 0;max-width:510px;font-size:16px;line-height:1.72;color:#b8b2ac;">${body}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:24px;border:1px solid rgba(255,255,255,0.08);background:linear-gradient(180deg,#111111 0%,#0b0b0b 100%);">
                  <tr>
                    <td style="padding:22px 22px 24px;">
                      <div style="font-size:12px;line-height:1.4;letter-spacing:.16em;text-transform:uppercase;color:#8f857e;">Acesso rápido</div>
                      <p style="margin:10px 0 0;font-size:15px;line-height:1.7;color:#d7d2cd;">Abra o painel pelo botao abaixo. Se preferir, o link completo tambem segue no fim deste email.</p>
                      <a href="${actionHref}" style="display:inline-block;margin-top:18px;border-radius:16px;background:linear-gradient(180deg,#ff624f 0%,#de3d2f 100%);padding:15px 22px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 20px 40px -24px rgba(222,61,47,0.85);">${actionLabel}</a>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-radius:22px;border:1px solid rgba(255,255,255,0.08);background:#121212;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <div style="font-size:12px;line-height:1.4;letter-spacing:.16em;text-transform:uppercase;color:#8f857e;">Mensagem da Studio Haki</div>
                      <p style="margin:10px 0 0;font-size:15px;line-height:1.72;color:#d9d3cd;">${actionHint}</p>
                    </td>
                  </tr>
                </table>

                <p style="margin:20px 0 0;font-size:12px;line-height:1.7;color:#857f79;">Se o botão não abrir, copie e cole o link abaixo no navegador:</p>
                <p style="margin:8px 0 0;word-break:break-all;font-size:13px;line-height:1.7;color:#ffb2a8;">${actionHref}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildInviteEmailSubject(boardName: string) {
  return `Seu acesso ao painel ${boardName} está pronto`;
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
  const tone = panelTone(accessKind);

  return buildEmailShell({
    title: buildInviteEmailSubject(safeBoardName),
    eyebrow: tone.eyebrow,
    badge: tone.badge,
    intro: "Seu acesso ao Painel Haki está pronto.",
    body: `${safeName}, seu email foi liberado para entrar no quadro <strong style="color:#ffffff;">${safeBoardName}</strong>. ${tone.subtitle}`,
    actionLabel: "Criar acesso agora",
    actionHref: safeInviteLink,
    actionHint:
      "Desejamos um fluxo leve, organizado e bons negócios por aí. Assim que você entrar, o quadro já abre com o workspace certo vinculado ao seu acesso.",
  });
}

export function buildWelcomeEmailSubject(boardName: string) {
  return `Bem-vindo ao Painel Haki - ${boardName}`;
}

export function buildWelcomeEmailHtml({
  recipientName,
  boardName,
  accessLink,
  accessKind,
}: WelcomeEmailPayload) {
  const safeName = escapeHtml(recipientName || "novo acesso");
  const safeBoardName = escapeHtml(boardName);
  const safeAccessLink = escapeHtml(accessLink);
  const tone = panelTone(accessKind);

  return buildEmailShell({
    title: buildWelcomeEmailSubject(safeBoardName),
    eyebrow: "Boas-vindas ao workspace",
    badge: tone.badge,
    intro: `Bem-vindo, ${safeName}.`,
    body: `Seu acesso ao quadro <strong style="color:#ffffff;">${safeBoardName}</strong> está ativo. Agora você já pode acompanhar demandas, conversas e entregas dentro do Painel Haki com um fluxo mais claro e profissional.`,
    actionLabel: "Entrar no painel",
    actionHref: safeAccessLink,
    actionHint:
      "Que esse novo ciclo venha com clareza, velocidade e bons negócios. O painel foi desenhado para reduzir ruído e concentrar tudo o que importa no mesmo lugar.",
  });
}
