import { NextResponse } from "next/server";
import { Resend } from "resend";
import { transporter } from "@/lib/email";
import { env } from "@/lib/env";
import { assertDebugAccess } from "@/lib/debug-auth";

/**
 * GET /api/debug/smtp?key=<DEBUG_KEY>
 * Diagnóstico do canal de envio. Detecta provider ativo (resend|smtp)
 * e testa conexão sem mandar email real:
 * - Resend: GET /domains (Full access) ou aceita restricted_api_key
 *   como "Sending only" válida
 * - SMTP: transporter.verify() handshake
 */
export async function GET(req: Request) {
  const guard = assertDebugAccess(req);
  if (guard) return guard;

  const provider = env.emailProvider();

  if (provider === "resend") {
    const config = {
      provider,
      RESEND_API_KEY_present: Boolean(env.RESEND_API_KEY),
      RESEND_API_KEY_length: env.RESEND_API_KEY?.length ?? 0,
      from: env.emailFrom(),
    };
    try {
      const resend = new Resend(env.RESEND_API_KEY!);
      const { error } = await resend.domains.list();
      if (error) {
        if (error.name === "restricted_api_key") {
          return NextResponse.json({
            ok: true,
            env: { ...config, scope: "sending_only" },
            note: "Chave válida com escopo 'Sending only' (least-privilege). Pode enviar emails normalmente. Pra testar envio real, use POST /api/debug/smtp.",
          });
        }
        throw new Error(`${error.name}: ${error.message}`);
      }
      return NextResponse.json({ ok: true, env: { ...config, scope: "full" } });
    } catch (e) {
      const err = e as Error;
      return NextResponse.json(
        {
          ok: false,
          env: config,
          error: { name: err.name, message: err.message },
        },
        { status: 500 },
      );
    }
  }

  // provider === "smtp"
  const config = {
    provider,
    SMTP_HOST: env.SMTP_HOST ?? null,
    SMTP_PORT: env.SMTP_PORT ?? null,
    SMTP_USER: env.SMTP_USER ?? null,
    SMTP_PASS_length: env.SMTP_PASS?.length ?? 0,
    from: env.emailFrom(),
  };

  try {
    await transporter.verify();
    return NextResponse.json({ ok: true, env: config });
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
        env: config,
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

/**
 * POST /api/debug/smtp?key=<DEBUG_KEY>&to=<email>
 * Envio real de email de teste — útil quando GET não consegue testar
 * (ex: chave Resend "Sending only").
 */
export async function POST(req: Request) {
  const guard = assertDebugAccess(req);
  if (guard) return guard;

  const url = new URL(req.url);
  const to = url.searchParams.get("to");
  if (!to || !to.includes("@")) {
    return NextResponse.json(
      { error: "Falta query string ?to=<email>" },
      { status: 400 },
    );
  }

  const provider = env.emailProvider();
  const from = env.emailFrom();

  if (provider === "resend") {
    try {
      const resend = new Resend(env.RESEND_API_KEY!);
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject: "[L2 Impure] Teste de envio",
        html: "<p>Se você recebeu, o pipeline Resend está funcionando.</p>",
      });
      if (error) {
        return NextResponse.json(
          {
            ok: false,
            provider,
            from,
            error: { name: error.name, message: error.message },
          },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true, provider, from, emailId: data?.id });
    } catch (e) {
      const err = e as Error;
      return NextResponse.json(
        {
          ok: false,
          provider,
          error: { name: err.name, message: err.message },
        },
        { status: 500 },
      );
    }
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: "[L2 Impure] Teste de envio",
      html: "<p>Se você recebeu, o pipeline SMTP está funcionando.</p>",
    });
    return NextResponse.json({
      ok: true,
      provider,
      from,
      messageId: info.messageId,
    });
  } catch (e) {
    const err = e as Error & { code?: string };
    return NextResponse.json(
      {
        ok: false,
        provider,
        error: { name: err.name, message: err.message, code: err.code },
      },
      { status: 500 },
    );
  }
}
