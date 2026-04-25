import nodemailer, { type Transporter } from "nodemailer";

declare global {
  // eslint-disable-next-line no-var
  var emailTransporter: Transporter | undefined;
}

function createTransporter(): Transporter {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST / SMTP_USER / SMTP_PASS não definidos");
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export const transporter: Transporter =
  globalThis.emailTransporter ?? createTransporter();

if (process.env.NODE_ENV !== "production") {
  globalThis.emailTransporter = transporter;
}

const FROM =
  process.env.SMTP_FROM ||
  `L2 Impure <${process.env.SMTP_USER ?? "admin@l2impure.com"}>`;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://l2impure.com";

function wrap(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#0a0a0f;font-family:'Open Sans',-apple-system,sans-serif;color:#ffffff;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0f;padding:34px 13px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#16161f;border:1px solid rgba(255,255,255,0.08);border-radius:13px;overflow:hidden;">
            <tr>
              <td style="padding:34px 34px 21px 34px;border-bottom:1px solid rgba(255,255,255,0.08);">
                <div style="font-family:'Oswald','Impact',sans-serif;font-weight:700;font-size:26px;letter-spacing:1px;color:#d4a14a;text-transform:uppercase;">L2 Impure</div>
                <div style="color:#707080;font-size:13px;margin-top:5px;">Servidor Interlude com Sistema de Híbridos</div>
              </td>
            </tr>
            <tr>
              <td style="padding:34px;">
                <h1 style="margin:0 0 21px 0;font-family:'Oswald','Impact',sans-serif;font-size:26px;font-weight:600;color:#ffffff;letter-spacing:0.5px;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:21px 34px;border-top:1px solid rgba(255,255,255,0.08);color:#707080;font-size:11px;line-height:1.6;">
                Você recebeu este email porque alguém (provavelmente você) fez uma ação no site <a href="${SITE_URL}" style="color:#d4a14a;text-decoration:none;">L2 Impure</a>. Se não foi você, ignore.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#e6b55a 0%,#d4a14a 50%,#b8862e 100%);color:#0a0a0f;text-decoration:none;font-family:'Oswald',sans-serif;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:1px;padding:13px 34px;border-radius:5px;box-shadow:0 5px 21px rgba(212,161,74,0.25);">${label}</a>`;
}

export async function sendVerificationEmail(
  to: string,
  token: string,
): Promise<void> {
  const link = `${SITE_URL}/verify?token=${encodeURIComponent(token)}`;
  const html = wrap(
    "Confirme seu email",
    `
    <p style="color:#b0b0c0;line-height:1.618;margin:0 0 21px 0;">Bem-vindo ao L2 Impure! Clique no botão abaixo para confirmar seu email e ativar sua conta.</p>
    <p style="margin:21px 0;">${button(link, "Confirmar Email")}</p>
    <p style="color:#707080;font-size:11px;line-height:1.618;margin:21px 0 0 0;">Ou cole este link no navegador: <br/><a href="${link}" style="color:#d4a14a;word-break:break-all;">${link}</a></p>
    <p style="color:#707080;font-size:11px;margin-top:21px;">O link expira em 24 horas.</p>
    `,
  );
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Confirme seu email • L2 Impure",
    html,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
): Promise<void> {
  const link = `${SITE_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const html = wrap(
    "Redefinir senha",
    `
    <p style="color:#b0b0c0;line-height:1.618;margin:0 0 21px 0;">Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo.</p>
    <p style="margin:21px 0;">${button(link, "Redefinir Senha")}</p>
    <p style="color:#707080;font-size:11px;line-height:1.618;margin:21px 0 0 0;">Ou cole este link no navegador: <br/><a href="${link}" style="color:#d4a14a;word-break:break-all;">${link}</a></p>
    <p style="color:#707080;font-size:11px;margin-top:21px;">O link expira em 1 hora. Se não foi você, ignore este email.</p>
    `,
  );
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Redefinir senha • L2 Impure",
    html,
  });
}
