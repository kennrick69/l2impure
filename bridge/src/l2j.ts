/**
 * Helpers L2J — formato de senha, mapa de classes, etc.
 */
import { createHash } from "node:crypto";

/**
 * L2J armazena senhas em SHA1+Base64 (legado da NCSoft).
 * Ex: senha "abc123" → SHA1 bytes → base64 = "bKE9UspwyIPg8LsQHkJaiehiTeU="
 */
export function l2jPasswordHash(plain: string): string {
  return createHash("sha1").update(plain, "utf8").digest("base64");
}

/**
 * Mapa parcial de classids → nome (Interlude). Adicionar conforme
 * precisar — fonte: l2j classpath ClassId.java.
 */
const CLASS_NAMES: Record<number, string> = {
  0: "Human Fighter",
  1: "Warrior",
  2: "Gladiator",
  3: "Warlord",
  4: "Human Knight",
  5: "Paladin",
  6: "Dark Avenger",
  7: "Rogue",
  8: "Treasure Hunter",
  9: "Hawkeye",
  10: "Human Mystic",
  11: "Human Wizard",
  12: "Sorcerer",
  13: "Necromancer",
  14: "Warlock",
  15: "Cleric",
  16: "Bishop",
  17: "Prophet",
  18: "Elven Fighter",
  19: "Elven Knight",
  20: "Temple Knight",
  21: "Sword Singer",
  22: "Elven Scout",
  23: "Plains Walker",
  24: "Silver Ranger",
  25: "Elven Mystic",
  26: "Elven Wizard",
  27: "Spellsinger",
  28: "Elemental Summoner",
  29: "Elven Oracle",
  30: "Elven Elder",
  31: "Dark Fighter",
  32: "Palus Knight",
  33: "Shillien Knight",
  34: "Bladedancer",
  35: "Assassin",
  36: "Abyss Walker",
  37: "Phantom Ranger",
  38: "Dark Mystic",
  39: "Dark Wizard",
  40: "Spellhowler",
  41: "Phantom Summoner",
  42: "Shillien Oracle",
  43: "Shillien Elder",
  44: "Orc Fighter",
  45: "Orc Raider",
  46: "Destroyer",
  47: "Orc Monk",
  48: "Tyrant",
  49: "Orc Mystic",
  50: "Orc Shaman",
  51: "Overlord",
  52: "Warcryer",
  53: "Dwarven Fighter",
  54: "Scavenger",
  55: "Bounty Hunter",
  56: "Artisan",
  57: "Warsmith",
  // Awakened (3rd class) Interlude
  88: "Duelist",
  89: "Dreadnought",
  90: "Phoenix Knight",
  91: "Hell Knight",
  92: "Sagittarius",
  93: "Adventurer",
  94: "Archmage",
  95: "Soultaker",
  96: "Arcana Lord",
  97: "Cardinal",
  98: "Hierophant",
  99: "Eva Templar",
  100: "Sword Muse",
  101: "Wind Rider",
  102: "Moonlight Sentinel",
  103: "Mystic Muse",
  104: "Elemental Master",
  105: "Eva Saint",
  106: "Shillien Templar",
  107: "Spectral Dancer",
  108: "Ghost Hunter",
  109: "Ghost Sentinel",
  110: "Storm Screamer",
  111: "Spectral Master",
  112: "Shillien Saint",
  113: "Titan",
  114: "Grand Khavatari",
  115: "Dominator",
  116: "Doomcryer",
  117: "Fortune Seeker",
  118: "Maestro",
};

export function classIdToName(classId: number): string {
  return CLASS_NAMES[classId] ?? `Unknown (${classId})`;
}

/**
 * Tabela de exp do L2J Interlude (default). Index = nível, valor = exp
 * mínimo pra entrar naquele nível. Levels 1..85 cobertos.
 *
 * Quando um GM seta level=N, a bridge também faz exp=EXP_TABLE[N] pra
 * o servidor não derivar level errado do exp na próxima carga do char.
 */
const EXP_TABLE: number[] = [
  0,
  0, 68, 363, 1168, 2884, 6038, 11287, 19423, 31378, 48229,
  71171, 100075, 136473, 181233, 235723, 301716, 380075, 472492,
  580366, 705689, 850285, 1016239, 1205616, 1420870, 1664676,
  1939883, 2249446, 2596578, 2984537, 3416790, 3897053, 4429209,
  5017212, 5665099, 6376964, 7156944, 8009109, 8937841, 9947514,
  11042798, 12228876, 13511145, 14895164, 16386854, 17993239,
  19720773, 21576473, 23567593, 25700701, 27986213, 30421030,
  33013681, 35773505, 38709020, 41829594, 45146121, 48652221,
  52364892, 56285604, 60571398, 65257634, 70391464, 75993482,
  82091919, 88701589, 95857201, 103583882, 111874360, 120822486,
  130466928, 140817152, 152040253, 164430816, 178277684, 193640574,
  210701490, 229629298, 250551849, 273774275, 299444459, 327787577,
  359069118, 393629679, 432037412, 474727320,
];

export function expForLevel(level: number): number {
  if (!Number.isFinite(level) || level < 1) return 0;
  const lastValue = EXP_TABLE[EXP_TABLE.length - 1] ?? 0;
  if (level >= EXP_TABLE.length) return lastValue;
  return EXP_TABLE[level] ?? 0;
}
