import { NextResponse } from "next/server";
import { Resend } from "resend";
import { transporter, emailProvider } from "@/lib/email";

/**
 * Endpoint de diagnóstico de envio de email.
 * - Detecta o provider ativo (resend | smtp)
 * - Verifica conexão sem disparar email real:
 *     • Resend: GET /domains (valida API key + conectividade)
 *     • SMTP: transporter.verify() (handshake)
 * - Retorna config (mascarando segredos) e detalhes do erro se falhar
 *
 * Acesso: GET /api/debug/smtp?key=<DEBUG_KEY>
 * Protegido por DEBUG_KEY no env pra não ficar aberto.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const expected = process.env.DEBUG_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "DEBUG_KEY env não setada — endpoint desativado" },
      { status: 503 },
    );
  }
  if (key !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const provider = emailProvider();

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY?.replace(
      /^["'](.+)["']$/,
      "$1",
    );
    const env = {
      provider,
      RESEND_API_KEY_present: Boolean(apiKey),
      RESEND_API_KEY_length: apiKey?.length ?? 0,
      RESEND_FROM:
        process.env.RESEND_FROM?.replace(/^["'](.+)["']$/, "$1") ??
        process.env.SMTP_FROM?.replace(/^["'](.+)["']$/, "$1") ??
        null,
    };
    try {
      const resend = new Resend(apiKey!);
      const { error } = await resend.domains.list();
      if (error) throw new Error(`${error.name}: ${error.message}`);
      return NextResponse.json({ ok: true, env });
    } catch (e) {
      const err = e as Error;
      return NextResponse.json(
        {
          ok: false,
          env,
          error: { name: err.name, message: err.message },
        },
        { status: 500 },
      );
    }
  }

  // provider === "smtp"
  const env = {
    provider,
    SMTP_HOST: process.env.SMTP_HOST?.replace(/^["'](.+)["']$/, "$1") ?? null,
    SMTP_PORT: process.env.SMTP_PORT?.replace(/^["'](.+)["']$/, "$1") ?? null,
    SMTP_USER: process.env.SMTP_USER?.replace(/^["'](.+)["']$/, "$1") ?? null,
    SMTP_PASS_length: (
      process.env.SMTP_PASS?.replace(/^["'](.+)["']$/, "$1") ?? ""
    ).length,
    SMTP_PASS_starts_with_quote:
      process.env.SMTP_PASS?.startsWith('"') ||
      process.env.SMTP_PASS?.startsWith("'"),
  };

  try {
    await transporter.verify();
    return NextResponse.json({ ok: true, env });
  } catch (e) {
    const err = e as Error & {
      code?: string;
      command?: string;
      response?: string;
      responseCode?: number;
    };
    return NextResponse.json(
      {
        ok: false,
        env,
        error: {
          name: err.name,
          message: err.message,
          code: err.code,
          command: err.command,
          response: err.response,
          responseCode: err.responseCode,
        },
      },
      { status: 500 },
    );
  }
}
