import { NextResponse } from "next/server";
import { requireAdmin, AdminError } from "./admin";
import { isGmUnlocked } from "./gm-pin";
import { BridgeError } from "./bridge";

/**
 * Só admin — sem PIN. Usar em endpoints de leitura (browse).
 */
export async function requireAdminApi() {
  try {
    return { admin: await requireAdmin() };
  } catch (e) {
    if (e instanceof AdminError) {
      return {
        response: NextResponse.json(
          { error: e.message },
          { status: e.status },
        ),
      };
    }
    throw e;
  }
}

/**
 * Admin + PIN da sessão GM. Usar em mutações que afetam o game DB.
 */
export async function requireAdminAndGmUnlock() {
  const r = await requireAdminApi();
  if (r.response) return r;
  if (!(await isGmUnlocked(r.admin.userId))) {
    return {
      response: NextResponse.json(
        {
          error: "Sessão GM expirada. Insira o PIN novamente.",
          code: "pin_required",
        },
        { status: 403 },
      ),
    };
  }
  return r;
}

export function bridgeErrorResponse(e: unknown): NextResponse {
  if (e instanceof BridgeError) {
    if (e.status === 404) {
      return NextResponse.json(
        { error: "Personagem ou item não encontrado" },
        { status: 404 },
      );
    }
    if (e.status === 409) {
      return NextResponse.json(
        { error: "Personagem online. Aguarde o jogador deslogar." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: `Bridge falhou (${e.status})` },
      { status: 502 },
    );
  }
  console.error("[admin gm helper]", e);
  return NextResponse.json(
    { error: "Erro de rede com a bridge" },
    { status: 502 },
  );
}
