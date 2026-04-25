import { NextResponse } from "next/server";
import { transporter } from "@/lib/email";

/**
 * Endpoint de diagnóstico SMTP.
 * - Verifica conexão sem mandar email (transporter.verify())
 * - Retorna config (mascarando senha) e detalhes do erro se falhar
 *
 * Acesso: GET /api/debug/smtp?key=<DEBUG_KEY>
 * Protegido por uma key simples no env DEBUG_KEY pra não ficar aberto.
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

  const env = {
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
