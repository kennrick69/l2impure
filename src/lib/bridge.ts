/**
 * Cliente HTTP para a bridge na VPS L2J.
 * Scaffold pra Fase 3 — autenticação HMAC + cache Redis.
 *
 * Todo request leva:
 *   X-API-Key:    chave compartilhada
 *   X-Timestamp:  epoch ms (bridge rejeita se > 30s de diff)
 *   X-Signature:  hex(HMAC-SHA256(timestamp + "." + method + path + "." + body))
 */
import { createHmac } from "node:crypto";
import { cached } from "./redis";

const BRIDGE_URL = process.env.BRIDGE_URL;
const API_KEY = process.env.BRIDGE_API_KEY;
const HMAC_SECRET = process.env.BRIDGE_HMAC_SECRET;

export class BridgeError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "BridgeError";
  }
}

function signRequest(method: string, path: string, body: string) {
  if (!API_KEY || !HMAC_SECRET) {
    throw new BridgeError("Bridge não configurada", 503);
  }
  const timestamp = Date.now().toString();
  const payload = `${timestamp}.${method}${path}.${body}`;
  const signature = createHmac("sha256", HMAC_SECRET)
    .update(payload)
    .digest("hex");
  return {
    "X-API-Key": API_KEY,
    "X-Timestamp": timestamp,
    "X-Signature": signature,
  };
}

export async function bridgeFetch<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  if (!BRIDGE_URL) {
    throw new BridgeError("BRIDGE_URL não configurada", 503);
  }
  const bodyStr = body ? JSON.stringify(body) : "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...signRequest(method, path, bodyStr),
  };
  const res = await fetch(`${BRIDGE_URL}${path}`, {
    method,
    headers,
    body: method !== "GET" && bodyStr ? bodyStr : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new BridgeError(
      `Bridge ${method} ${path} failed: ${res.status} ${text}`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

/* ========= High-level wrappers (com cache) ========= */

export type ServerStatus = {
  online: boolean;
  players: number;
  playersRaw?: number;
  dbOk?: boolean;
  gameServerReachable?: boolean;
  loginServerReachable?: boolean;
  timestamp?: number;
  uptime?: number;
};
export type PvpRow = {
  rank: number;
  name: string;
  className: string;
  level: number;
  clan: string | null;
  value: number;
};
export type ClanRow = {
  rank: number;
  name: string;
  level: number;
  reputation: number;
  members: number;
  leader: string | null;
};
export type GameCharacter = {
  name: string;
  classId: number;
  className: string;
  level: number;
  online: boolean;
  pvp: number;
  pk: number;
  clanId: number | null;
  clanName: string | null;
};
export type CharactersResponse = {
  login: string;
  characters: GameCharacter[];
  count: number;
};

export const bridge = {
  async status(): Promise<ServerStatus> {
    return cached("server:status", 30, () =>
      bridgeFetch<ServerStatus>("GET", "/status"),
    );
  },
  async topPvp(): Promise<PvpRow[]> {
    return cached("rankings:pvp", 300, () =>
      bridgeFetch<PvpRow[]>("GET", "/rankings/pvp"),
    );
  },
  async topPk(): Promise<PvpRow[]> {
    return cached("rankings:pk", 300, () =>
      bridgeFetch<PvpRow[]>("GET", "/rankings/pk"),
    );
  },
  async topClans(): Promise<ClanRow[]> {
    return cached("rankings:clans", 300, () =>
      bridgeFetch<ClanRow[]>("GET", "/rankings/clans"),
    );
  },
  async createAccount(login: string, password: string) {
    return bridgeFetch("POST", "/accounts/create", { login, password });
  },
  async resetHwid(login: string) {
    return bridgeFetch("POST", "/accounts/reset-hwid", { login });
  },
  async changeGamePassword(login: string, password: string) {
    return bridgeFetch("POST", "/accounts/change-password", {
      login,
      password,
    });
  },
  async deleteAccount(login: string) {
    return bridgeFetch<{ ok: true; login: string; charactersDeleted: number }>(
      "DELETE",
      `/accounts/${encodeURIComponent(login)}`,
    );
  },
  async getCharacters(login: string): Promise<CharactersResponse> {
    return bridgeFetch<CharactersResponse>(
      "GET",
      `/characters/${encodeURIComponent(login)}`,
    );
  },
  async getMaxLevel(login: string): Promise<{ login: string; maxLevel: number }> {
    return bridgeFetch<{ login: string; maxLevel: number }>(
      "GET",
      `/characters/max-level/${encodeURIComponent(login)}`,
    );
  },
  async restartGameServer() {
    return bridgeFetch<{ ok: true; stdout?: string; stderr?: string }>(
      "POST",
      "/server/restart",
      {},
    );
  },
};
