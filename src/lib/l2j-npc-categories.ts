import type { NpcMetadata } from "./bridge";

/** Tipos do template que NÃO são NPCs interativos. */
export const MOB_TYPES = [
  "Monster",
  "RaidBoss",
  "GrandBoss",
  "FestivalMonster",
  "RiftInvader",
  "ChestInstance",
  "Pet",
  "Servitor",
] as const;

export type NpcCategory =
  | "all"
  | "city"
  | "merchant"
  | "gatekeeper"
  | "trainer"
  | "guard"
  | "raid"
  | "monster"
  | "custom"
  | "any";

export const NPC_CATEGORIES: { key: NpcCategory; label: string }[] = [
  { key: "all", label: "Todos interativos" },
  { key: "city", label: "NPCs de Cidade" },
  { key: "merchant", label: "Mercadores" },
  { key: "gatekeeper", label: "Gatekeepers / Teleporters" },
  { key: "trainer", label: "Trainers / Class Masters" },
  { key: "guard", label: "Guards" },
  { key: "raid", label: "Raid / Grand Bosses" },
  { key: "monster", label: "Monsters (mobs)" },
  { key: "custom", label: "Custom do fork (ID ≥ 50.000)" },
  { key: "any", label: "TUDO (sem filtro)" },
];

const CITY_TYPES = [
  "Folk",
  "Merchant",
  "Trainer",
  "WarehouseKeeper",
  "Blacksmith",
  "FishermanInstructor",
  "Auctioneer",
  "ArenaManager",
  "ClanHallManager",
  "Buffer",
  "DimensionalMerchant",
];

const GUARD_TYPES = ["Guard", "SiegeGuard", "DefenderInstance"];

export function isGatekeeper(npc: NpcMetadata): boolean {
  const re = /gatekeeper|teleport/i;
  return re.test(npc.title) || re.test(npc.name);
}

export function npcMatchesCategory(
  npc: NpcMetadata,
  cat: NpcCategory,
): boolean {
  const t = npc.type ?? "";
  switch (cat) {
    case "any":
      return true;
    case "all":
      return !(MOB_TYPES as readonly string[]).includes(t);
    case "city":
      return CITY_TYPES.includes(t) || isGatekeeper(npc);
    case "merchant":
      return t === "Merchant";
    case "gatekeeper":
      return isGatekeeper(npc);
    case "trainer":
      return t === "Trainer" || /class master/i.test(npc.title);
    case "guard":
      return GUARD_TYPES.includes(t);
    case "raid":
      return t === "RaidBoss" || t === "GrandBoss";
    case "monster":
      return t === "Monster" || t === "FestivalMonster" || t === "RiftInvader";
    case "custom":
      return npc.id >= 50000;
  }
}
