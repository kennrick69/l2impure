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
  method: "GET" | "POST" | "DELETE" | "PATCH" | "PUT",
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

/** Resposta da busca admin (/admin/characters/search) — campos extras vs GameCharacter. */
export type AdminGmCharacter = {
  charId: number;
  name: string;
  classId: number;
  className: string;
  level: number;
  online: boolean;
  account: string;
  clanId: number | null;
  clanName: string | null;
};
export type AdminGmSearchResponse = {
  characters: AdminGmCharacter[];
  count: number;
};

export type AdminGmCharListItem = AdminGmCharacter & {
  pvp: number;
  pk: number;
};
export type AdminGmListResponse = {
  characters: AdminGmCharListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminGmInventoryItem = {
  objectId: number;
  itemId: number;
  count: number;
  enchantLevel: number;
  loc: string;
  locData: number;
};
export type AdminGmCharFull = AdminGmCharacter & {
  pvp: number;
  pk: number;
  exp: number;
  sp: number;
  karma: number;
  x: number;
  y: number;
  z: number;
  maxHp: number;
  maxMp: number;
  maxCp: number;
  race: number;
  sex: number;
  lastAccess: number;
  onlinetime: number;
  nobless: boolean;
  hero: boolean;
};
export type AdminGmCharFullResponse = {
  char: AdminGmCharFull;
  inventory: AdminGmInventoryItem[];
};

export type AdminGmItemOwner = {
  objectId: number;
  charId: number;
  charName: string;
  account: string;
  online: boolean;
  level: number;
  classId: number;
  count: number;
  enchantLevel: number;
  loc: string;
};
export type AdminGmItemOwnersResponse = {
  owners: AdminGmItemOwner[];
  total: number;
  itemId: number;
  limit: number;
  offset: number;
};

export type ItemMetadata = {
  id: number;
  type: string;
  name: string;
  grade: string;
  slot: string | null;
  weight: number;
  weaponType: string | null;
  armorType: string | null;
  material: string | null;
  stackable: boolean;
  price: number;
};

export type NpcMetadata = {
  id: number;
  name: string;
  title: string;
  type: string | null;
  level: number;
  hp: number;
  mp: number;
  exp: number;
  sp: number;
  pAtk: number;
  pDef: number;
  mAtk: number;
  mDef: number;
};

export type NpcSpawn = {
  npcId: number;
  x: number;
  y: number;
  z: number;
  heading: number;
  respawnDelay: number;
  respawnRand: number;
  periodOfDay: number;
};
export type NpcSpawnsResponse = {
  npcId: number;
  count: number;
  spawns: NpcSpawn[];
};

export type NpcDialogueFile = { path: string; size: number };
export type NpcDialoguesResponse = {
  npcId: number;
  count: number;
  files: NpcDialogueFile[];
};
export type NpcDialogueRead = {
  path: string;
  content: string;
  size: number;
  mtime: number;
};

export type NpcBuylistProduct = { itemId: number; price: number };
export type NpcBuylist = {
  buyListId: number;
  products: NpcBuylistProduct[];
};
export type NpcBuylistsResponse = {
  npcId: number;
  buylists: NpcBuylist[];
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
  gm: {
    async searchCharacters(name: string): Promise<AdminGmSearchResponse> {
      return bridgeFetch<AdminGmSearchResponse>(
        "GET",
        `/admin/characters/search?name=${encodeURIComponent(name)}`,
      );
    },
    async setLevel(charName: string, level: number) {
      return bridgeFetch("POST", "/admin/characters/set-level", {
        charName,
        level,
      });
    },
    async setClass(charName: string, classId: number) {
      return bridgeFetch("POST", "/admin/characters/set-class", {
        charName,
        classId,
      });
    },
    async addItem(charName: string, itemId: number, count: number) {
      return bridgeFetch("POST", "/admin/characters/add-item", {
        charName,
        itemId,
        count,
      });
    },
    async setName(charId: number, newName: string) {
      return bridgeFetch("POST", "/admin/characters/set-name", {
        charId,
        newName,
      });
    },
    async addAdena(charName: string, amount: number) {
      return bridgeFetch("POST", "/admin/characters/add-adena", {
        charName,
        amount,
      });
    },
    async setAccessLevel(login: string, level: number) {
      return bridgeFetch("POST", "/admin/accounts/set-access-level", {
        login,
        level,
      });
    },
    async teleport(charName: string, x: number, y: number, z: number) {
      return bridgeFetch("POST", "/admin/characters/teleport", {
        charName,
        x,
        y,
        z,
      });
    },
    async listCharacters(
      query: Record<string, string | number | boolean | undefined>,
    ): Promise<AdminGmListResponse> {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== "") {
          qs.append(k, String(v));
        }
      }
      return bridgeFetch<AdminGmListResponse>(
        "GET",
        `/admin/characters/list?${qs.toString()}`,
      );
    },
    async getCharacterFull(charId: number): Promise<AdminGmCharFullResponse> {
      return bridgeFetch<AdminGmCharFullResponse>(
        "GET",
        `/admin/characters/${charId}/full`,
      );
    },
    async addInventoryItem(
      charId: number,
      itemId: number,
      count: number,
      enchantLevel: number = 0,
    ) {
      return bridgeFetch("POST", `/admin/characters/${charId}/items/add`, {
        itemId,
        count,
        enchantLevel,
      });
    },
    async modifyInventoryItem(
      charId: number,
      objectId: number,
      patch: { count?: number; enchantLevel?: number },
    ) {
      return bridgeFetch("POST", `/admin/characters/${charId}/items/modify`, {
        objectId,
        ...patch,
      });
    },
    async removeInventoryItem(charId: number, objectId: number) {
      return bridgeFetch("POST", `/admin/characters/${charId}/items/remove`, {
        objectId,
      });
    },
    async findItemOwners(
      itemId: number,
      limit: number = 100,
      offset: number = 0,
    ): Promise<AdminGmItemOwnersResponse> {
      return bridgeFetch<AdminGmItemOwnersResponse>(
        "GET",
        `/admin/items/owners?itemId=${itemId}&limit=${limit}&offset=${offset}`,
      );
    },
    async getItemsMetadata(): Promise<ItemMetadata[]> {
      return bridgeFetch<ItemMetadata[]>("GET", "/admin/items/metadata");
    },
    async getNpcsMetadata(): Promise<NpcMetadata[]> {
      return bridgeFetch<NpcMetadata[]>("GET", "/admin/npcs/metadata");
    },
    async getNpcSpawns(npcId: number): Promise<NpcSpawnsResponse> {
      return bridgeFetch<NpcSpawnsResponse>(
        "GET",
        `/admin/npcs/${npcId}/spawns`,
      );
    },
    async addNpcSpawn(
      npcId: number,
      data: {
        x: number;
        y: number;
        z: number;
        heading?: number;
        respawnDelay?: number;
        respawnRand?: number;
        periodOfDay?: number;
      },
    ) {
      return bridgeFetch("POST", `/admin/npcs/${npcId}/spawns`, data);
    },
    async moveNpcSpawn(payload: {
      npcId: number;
      x: number;
      y: number;
      z: number;
      newX: number;
      newY: number;
      newZ: number;
      heading?: number;
      respawnDelay?: number;
    }) {
      return bridgeFetch("PATCH", "/admin/npcs/spawns", payload);
    },
    async deleteNpcSpawn(payload: {
      npcId: number;
      x: number;
      y: number;
      z: number;
    }) {
      return bridgeFetch("DELETE", "/admin/npcs/spawns", payload);
    },
    async getNpcDialogues(npcId: number): Promise<NpcDialoguesResponse> {
      return bridgeFetch<NpcDialoguesResponse>(
        "GET",
        `/admin/npcs/${npcId}/dialogues`,
      );
    },
    async readNpcDialogue(filePath: string): Promise<NpcDialogueRead> {
      return bridgeFetch<NpcDialogueRead>(
        "GET",
        `/admin/npcs/dialogue?path=${encodeURIComponent(filePath)}`,
      );
    },
    async writeNpcDialogue(filePath: string, content: string) {
      return bridgeFetch(
        "PUT",
        `/admin/npcs/dialogue?path=${encodeURIComponent(filePath)}`,
        { content },
      );
    },
    async getNpcBuylists(npcId: number): Promise<NpcBuylistsResponse> {
      return bridgeFetch<NpcBuylistsResponse>(
        "GET",
        `/admin/npcs/${npcId}/buylists`,
      );
    },
    async addBuylistProduct(
      buyListId: number,
      itemId: number,
      price: number,
    ) {
      return bridgeFetch(
        "POST",
        `/admin/npcs/buylists/${buyListId}/products`,
        { itemId, price },
      );
    },
    async removeBuylistProduct(buyListId: number, itemId: number) {
      return bridgeFetch(
        "DELETE",
        `/admin/npcs/buylists/${buyListId}/products/${itemId}`,
      );
    },
    async renameNpc(npcId: number, name: string, title: string) {
      return bridgeFetch<{ ok: true; file: string; restartRequired: true }>(
        "PATCH",
        `/admin/npcs/${npcId}`,
        { name, title },
      );
    },
    async clearNpcCache() {
      return bridgeFetch("POST", "/admin/npcs/cache/clear", {});
    },
    async getAllNpcSpawns(): Promise<{
      byNpc: Record<string, { x: number; y: number }[]>;
    }> {
      return bridgeFetch("GET", "/admin/npcs/all-spawns");
    },
  },
};
