import { NextResponse } from "next/server";
import { requireAdmin, AdminError } from "@/lib/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getSecret } from "@/lib/secrets";

/**
 * POST /api/admin/secrets/mp/test — testa as credenciais do Mercado Pago
 * atualmente ativas (DB → env fallback) chamando GET /users/me.
 * Não recebe nem devolve nenhum secret — só o veredito.
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const rl = await rateLimit("admin_secrets_test", clientIp(req), 10, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  const token = await getSecret("mp.access_token", "MP_ACCESS_TOKEN");
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Access Token não configurado (nem no painel, nem em MP_ACCESS_TOKEN)" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `MP rejeitou o token (HTTP ${res.status}): ${
            (data.message as string) ?? "credencial inválida"
          }`,
        },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      accountId: data.id ?? null,
      nickname: (data.nickname as string) ?? null,
      siteId: (data.site_id as string) ?? null,
      liveMode: !((data.tags as string[] | undefined) ?? []).includes("test_user"),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erro de rede ao chamar o Mercado Pago" },
      { status: 502 },
    );
  }
}
