import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

declare global {
  // eslint-disable-next-line no-var
  var emailTransporter: Transporter | undefined;
  // eslint-disable-next-line no-var
  var resendClient: Resend | undefined;
}

/**
 * Tira aspas literais que podem ter sido coladas dentro do valor da env var.
 * Railway aceita ambos os formatos, mas se o usuário colar com aspas
 * elas viram parte do valor.
 */
function clean(v: string | undefined): string | undefined {
  if (!v) return v;
  const m = v.match(/^["'](.+)["']$/);
  return m ? m[1] : v;
}

const SITE_URL =
  clean(process.env.NEXT_PUBLIC_SITE_URL) ?? "https://l2impure.com";

const FROM =
  clean(process.env.SMTP_FROM) ||
  clean(process.env.RESEND_FROM) ||
  `L2 Impure <${clean(process.env.SMTP_USER) ?? "admin@l2impure.com"}>`;

/**
 * Provider ativo. Auto-detect: se RESEND_API_KEY existe, usa Resend.
 * Senão cai pra Nodemailer SMTP (legado Hostinger).
 */
export function emailProvider(): "resend" | "smtp" {
  return clean(process.env.RESEND_API_KEY) ? "resend" : "smtp";
}

// ---------- Resend ----------

function getResend(): Resend {
  if (globalThis.resendClient) return globalThis.resendClient;
  const key = clean(process.env.RESEND_API_KEY);
  if (!key) throw new Error("RESEND_API_KEY não definida");
  const client = new Resend(key);
  if (process.env.NODE_ENV !== "production") {
    globalThis.resendClient = client;
  }
  return client;
}

// ---------- Nodemailer SMTP ----------

function createTransporter(): Transporter {
  const host = clean(process.env.SMTP_HOST);
  const port = Number(clean(process.env.SMTP_PORT) ?? 465);
  const user = clean(process.env.SMTP_USER);
  const pass = clean(process.env.SMTP_PASS);
  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST / SMTP_USER / SMTP_PASS não definidos");
  }
  console.info(
    `[smtp] init host=${host} port=${port} secure=${port === 465} user=${user} pass.length=${pass.length}`,
  );
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    logger: process.env.SMTP_DEBUG === "true",
    debug: process.env.SMTP_DEBUG === "true",
  });
}

function getTransporter(): Transporter {
  if (globalThis.emailTransporter) return globalThis.emailTransporter;
  const t = createTransporter();
  if (process.env.NODE_ENV !== "production") {
    globalThis.emailTransporter = t;
  }
  return t;
}

/** Mantido pra compatibilidade com /api/debug/smtp. */
export const transporter: Transporter = new Proxy({} as Transporter, {
  get(_t, prop) {
    return getTransporter()[prop as keyof Transporter];
  },
});

// ---------- Dispatch ----------

async function dispatch(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const provider = emailProvider();
  if (provider === "resend") {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      throw new Error(`[resend] ${error.name}: ${error.message}`);
    }
    return;
  }
  await getTransporter().sendMail({
    from: FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}

// ---------- Templates ----------

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
                <div style="color:#707080;font-size:13px;margin-top:5px;">Servidor brasileiro de Lineage 2 Interlude</div>
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
  // Aponta direto pro endpoint API (GET handler) que consome o token,
  // marca isVerified=true e redireciona pra /login?verified=1.
  // A página /verify só serve pra mostrar erros (?error=...).
  const link = `${SITE_URL}/api/auth/verify?token=${encodeURIComponent(token)}`;
  const html = wrap(
    "Confirme seu email",
    `
    <p style="color:#b0b0c0;line-height:1.618;margin:0 0 21px 0;">Bem-vindo ao L2 Impure! Clique no botão abaixo para confirmar seu email e ativar sua conta.</p>
    <p style="margin:21px 0;">${button(link, "Confirmar Email")}</p>
    <p style="color:#707080;font-size:11px;line-height:1.618;margin:21px 0 0 0;">Ou cole este link no navegador: <br/><a href="${link}" style="color:#d4a14a;word-break:break-all;">${link}</a></p>
    <p style="color:#707080;font-size:11px;margin-top:21px;">O link expira em 24 horas.</p>
    `,
  );
  await dispatch({ to, subject: "Confirme seu email • L2 Impure", html });
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
  await dispatch({ to, subject: "Redefinir senha • L2 Impure", html });
}
