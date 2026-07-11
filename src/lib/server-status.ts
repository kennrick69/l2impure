import { bridge, type ServerStatus } from "./bridge";
import { getSetting, SETTINGS } from "./settings";

/**
 * Status do servidor de jogo com o override admin do player count.
 *
 * Centraliza a lógica que antes vivia inline no layout do dashboard:
 * 1. bridge.status() — cache Redis 30s + snapshot stale 24h (se a
 *    bridge cair, serve o último dado bom em vez de falhar).
 * 2. Se PG.settings tem `player_count_offset`, soma ao playersRaw em
 *    vez de usar o offset do .env da bridge.
 *
 * Retorna `null` só quando a bridge está fora E nunca houve snapshot.
 */
export async function getServerStatus(): Promise<ServerStatus | null> {
  let status: ServerStatus;
  try {
    status = await bridge.status();
  } catch (e) {
    console.warn("[server-status] bridge.status() falhou:", (e as Error).message);
    return null;
  }

  try {
    const override = await getSetting<number | null>(
      SETTINGS.playerCountOffset,
      null,
    );
    if (
      typeof override === "number" &&
      typeof status.playersRaw === "number"
    ) {
      status = { ...status, players: status.playersRaw + override };
    }
  } catch (e) {
    // Sem PG não tem override — segue com o offset da bridge
    console.warn("[server-status] override lookup falhou:", (e as Error).message);
  }

  return status;
}

/** Segundos de idade a partir dos quais o snapshot é marcado como stale. */
export const STALE_AFTER_SECONDS = 90;

export type PublicServerStatus = {
  online: boolean;
  players: number;
  timestamp: number | null;
  ageSeconds: number | null;
  stale: boolean;
};

/**
 * Versão pública e enxuta do status — expõe SÓ o que o jogador pode
 * ver (online + players). Campos internos (playersRaw, dbOk,
 * gameServerReachable) ficam de fora de propósito.
 */
export async function getPublicServerStatus(): Promise<PublicServerStatus> {
  const status = await getServerStatus();
  if (!status) {
    return {
      online: false,
      players: 0,
      timestamp: null,
      ageSeconds: null,
      stale: true,
    };
  }
  const ts = typeof status.timestamp === "number" ? status.timestamp : null;
  const ageSeconds =
    ts !== null ? Math.max(0, Math.round((Date.now() - ts) / 1000)) : null;
  return {
    online: status.online,
    players: status.players,
    timestamp: ts,
    ageSeconds,
    stale: ageSeconds !== null ? ageSeconds > STALE_AFTER_SECONDS : false,
  };
}
