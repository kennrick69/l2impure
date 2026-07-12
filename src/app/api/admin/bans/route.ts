import { NextResponse } from "next/server";
import { requireAdmin, AdminError } from "@/lib/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { bridgeFetch, BridgeError } from "@/lib/bridge";

/**
 * Lista de bans de conta (tabela account_bans na VPS, via bridge).
 *
 * GET /api/admin/bans?status=active|all&limit=50&login=<busca>
 *
 * As AÇÕES de banir/desbanir NÃO passam por aqui — vão pela fila GM
 * (POST /api/admin/gm-commands, tipos ban_account/unban_account, PIN
 * obrigatório), porque quem executa é o gameserver (kick da sessão ativa
 * + UPDATE accounts + histórico). Aqui é só leitura pro painel.
 */

export type BanDto = {
  id: number;
  accountLogin: string;
  reason: string;
  bannedBy: string;
  bannedAt: string | null;
  expiresAt: string | null;
  unbannedAt: string | null;
  unbannedBy: string | null;
  accessLevel: number | null;
  active: boolean;
};

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const rl = await rateLimit("admin_bans_list", clientIp(req), 120, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") === "all" ? "all" : "active";
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
    200,
  );
  const login = (url.searchParams.get("login") ?? "").trim().slice(0, 48);

  const qs = new URLSearchParams({ status, limit: String(limit) });
  if (login) qs.set("login", login);

  try {
    const data = await bridgeFetch<{ bans: BanDto[] }>(
      "GET",
      `/account-bans?${qs.toString()}`,
    );
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BridgeError) {
      return NextResponse.json(
        { error: `Bridge falhou (${e.status})` },
        { status: 502 },
      );
    }
    console.error("[/api/admin/bans]", e);
    return NextResponse.json(
      { error: "Erro de rede com a bridge" },
      { status: 502 },
    );
  }
}
