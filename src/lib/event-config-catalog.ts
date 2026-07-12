/**
 * Catálogo dos eventos configuráveis pelo painel — metadados de UI e
 * validação por campo. Os VALORES vivem no Postgres (EventConfig.config);
 * aqui fica só o que é código: labels, tipos, limites, ajuda.
 *
 * Unidades seguem o próprio .properties do aCis (min, seg, ids de item).
 * Horários são em BRT — a JVM do gameserver roda com
 * -Duser.timezone=America/Sao_Paulo (Fase Admin 3A).
 *
 * Puro dado (sem imports) — importável em Server e Client Components.
 */

export type EventFieldType =
  | "int"      // número inteiro (min/max)
  | "bool"     // toggle True/False
  | "timeList" // "HH:MM,HH:MM,..." — horários BRT
  | "rewardList" // "itemId,qtd" ou "itemId-qtd", múltiplos com ";"
  | "text";    // string livre validada por pattern

export type EventFieldDef = {
  key: string;
  label: string;
  type: EventFieldType;
  min?: number;
  max?: number;
  help?: string;
};

export type EventDef = {
  slug: string;
  /** false = o evento não tem key de liga/desliga no properties (sempre on) */
  hasEnabledToggle: boolean;
  description: string;
  fields: EventFieldDef[];
};

export const TIME_LIST_RE =
  /^([01]\d|2[0-3]):[0-5]\d(,([01]\d|2[0-3]):[0-5]\d)*$/;
export const REWARD_LIST_RE =
  /^\d{1,9}[,-]\d{1,9}(;\d{1,9}[,-]\d{1,9})*$/;

export const EVENT_CATALOG: Record<string, EventDef> = {
  olympiad: {
    slug: "olympiad",
    hasEnabledToggle: false,
    description:
      "Grand Olympiad — período de competição diário. Sem key de on/off no aCis (sempre ativa).",
    fields: [
      { key: "startHour", label: "Hora de início (BRT, 0-23)", type: "int", min: 0, max: 23, help: "AltOlyStartTime — 18 = 18h de Brasília" },
      { key: "startMin", label: "Minuto de início", type: "int", min: 0, max: 59 },
      { key: "classedParticipants", label: "Mín. participantes (classed)", type: "int", min: 2, max: 100 },
      { key: "nonClassedParticipants", label: "Mín. participantes (non-classed)", type: "int", min: 2, max: 100 },
      { key: "classedReward", label: "Reward classed (itemId-qtd)", type: "rewardList", help: "ex: 6651-50" },
      { key: "nonClassedReward", label: "Reward non-classed (itemId-qtd)", type: "rewardList", help: "ex: 6651-30" },
      { key: "announceGames", label: "Anunciar início das lutas", type: "bool" },
    ],
  },
  sevensigns: {
    slug: "sevensigns",
    hasEnabledToggle: false,
    description:
      "Seven Signs & Festival of Darkness. Ciclos internos ficam no default do aCis.",
    fields: [
      { key: "festivalMinPlayers", label: "Mín. players no Festival", type: "int", min: 1, max: 9 },
      { key: "castleForDawn", label: "Dawn exige castelo/taxa", type: "bool" },
      { key: "castleForDusk", label: "Dusk bloqueia donos de castelo", type: "bool" },
      { key: "maxPlayerContrib", label: "Contribuição máx. por player", type: "int", min: 1, max: 2000000000 },
    ],
  },
  tvt: {
    slug: "tvt",
    hasEnabledToggle: true,
    description: "Team vs Team automático (event engine).",
    fields: [
      { key: "interval", label: "Horários (BRT, HH:MM separados por vírgula)", type: "timeList", help: "ex: 09:00,15:00,21:00" },
      { key: "minPlayers", label: "Mín. players", type: "int", min: 1, max: 500 },
      { key: "runningTimeMin", label: "Duração (minutos)", type: "int", min: 1, max: 120 },
      { key: "winnerRewards", label: "Reward vencedor (itemId,qtd)", type: "rewardList" },
      { key: "drawRewards", label: "Reward empate (itemId,qtd)", type: "rewardList" },
    ],
  },
  ctf: {
    slug: "ctf",
    hasEnabledToggle: true,
    description: "Capture the Flag automático (event engine).",
    fields: [
      { key: "interval", label: "Horários (BRT, HH:MM separados por vírgula)", type: "timeList" },
      { key: "minPlayers", label: "Mín. players", type: "int", min: 1, max: 500 },
      { key: "runningTimeMin", label: "Duração (minutos)", type: "int", min: 1, max: 120 },
      { key: "onScoreRewards", label: "Reward por captura (itemId,qtd)", type: "rewardList" },
      { key: "winnerRewards", label: "Reward vencedor (itemId,qtd)", type: "rewardList" },
      { key: "drawRewards", label: "Reward empate (itemId,qtd)", type: "rewardList" },
    ],
  },
  dm: {
    slug: "dm",
    hasEnabledToggle: true,
    description: "Deathmatch automático (event engine).",
    fields: [
      { key: "interval", label: "Horários (BRT, HH:MM separados por vírgula)", type: "timeList" },
      { key: "minPlayers", label: "Mín. players", type: "int", min: 1, max: 500 },
      { key: "runningTimeMin", label: "Duração (minutos)", type: "int", min: 1, max: 120 },
      { key: "onKillRewards", label: "Reward por kill (itemId,qtd)", type: "rewardList" },
      { key: "winnerRewards", label: "Reward vencedor (itemId,qtd)", type: "rewardList" },
    ],
  },
  pvpevent: {
    slug: "pvpevent",
    hasEnabledToggle: true,
    description: "Evento de zona PvP com reward pro vencedor.",
    fields: [
      { key: "interval", label: "Horários (BRT, HH:MM separados por vírgula)", type: "timeList" },
      { key: "runningTimeMin", label: "Duração (minutos)", type: "int", min: 1, max: 180 },
      { key: "winnerReward", label: "Reward vencedor (itemId,qtd)", type: "rewardList" },
    ],
  },
  killtheboss: {
    slug: "killtheboss",
    hasEnabledToggle: false,
    description:
      "Kill the Boss — boss spawnado em horários fixos. Sem key de on/off no properties.",
    fields: [
      { key: "eventTimes", label: "Horários (BRT, HH:MM separados por vírgula)", type: "timeList" },
      { key: "minPlayers", label: "Mín. players", type: "int", min: 1, max: 500 },
      { key: "minDamage", label: "Dano mínimo pra reward", type: "int", min: 1, max: 100000000 },
      { key: "generalRewards", label: "Rewards gerais (itemId,qtd;itemId,qtd)", type: "rewardList" },
      { key: "registrationTimeSec", label: "Tempo de registro (segundos)", type: "int", min: 10, max: 3600 },
    ],
  },
  tournament: {
    slug: "tournament",
    hasEnabledToggle: true,
    description: "Tournament 2x2 / 4x4 / 9x9 com arenas.",
    fields: [
      { key: "startTimes", label: "Horários (BRT, HH:MM separados por vírgula)", type: "timeList" },
      { key: "eventTimeMin", label: "Duração (minutos)", type: "int", min: 5, max: 360 },
      { key: "rewardId", label: "Item de reward (itemId)", type: "int", min: 1, max: 100000 },
      { key: "winRewardCount", label: "Qtd reward vitória (2x2)", type: "int", min: 0, max: 100000 },
      { key: "lostRewardCount", label: "Qtd reward derrota (2x2)", type: "int", min: 0, max: 100000 },
    ],
  },
  partyfarm: {
    slug: "partyfarm",
    hasEnabledToggle: true,
    description: "Party Farm — farm em grupo com spawns temporários.",
    fields: [
      { key: "startTimes", label: "Horários (BRT, HH:MM separados por vírgula)", type: "timeList" },
      { key: "eventTimeMin", label: "Duração (minutos)", type: "int", min: 5, max: 240 },
      { key: "dropList", label: "Drop (itemId,chance,min,max)", type: "text", help: "formato do aCis: 3470,100,1,2" },
    ],
  },
  pcbang: {
    slug: "pcbang",
    hasEnabledToggle: true,
    description: "PC Bang Points — pontos por tempo online.",
    fields: [
      { key: "minLevel", label: "Level mínimo", type: "int", min: 1, max: 80 },
      { key: "minCount", label: "Pontos mín. por tick", type: "int", min: 0, max: 100000 },
      { key: "maxCount", label: "Pontos máx. por tick", type: "int", min: 0, max: 100000 },
      { key: "intervalSec", label: "Intervalo do tick (segundos)", type: "int", min: 60, max: 86400 },
      { key: "dualChance", label: "Chance de ponto dobrado (%)", type: "int", min: 0, max: 100 },
    ],
  },
};

/** Ordem de exibição no painel. */
export const EVENT_ORDER = [
  "olympiad",
  "tvt",
  "ctf",
  "dm",
  "tournament",
  "pvpevent",
  "killtheboss",
  "partyfarm",
  "pcbang",
  "sevensigns",
];

const TEXT_SAFE_RE = /^[\w .,;:\-]{1,512}$/;

export type FieldError = { key: string; message: string };

/**
 * Valida um config contra o catálogo. Retorna a lista de erros (vazia = ok)
 * e o config normalizado (números coagidos, strings trimmed).
 */
export function validateEventConfig(
  slug: string,
  config: Record<string, unknown>,
): { errors: FieldError[]; normalized: Record<string, number | boolean | string> } {
  const def = EVENT_CATALOG[slug];
  const errors: FieldError[] = [];
  const normalized: Record<string, number | boolean | string> = {};
  if (!def) return { errors: [{ key: "*", message: "evento desconhecido" }], normalized };

  for (const field of def.fields) {
    const raw = config[field.key];
    if (raw === undefined || raw === null) {
      errors.push({ key: field.key, message: "campo obrigatório" });
      continue;
    }
    switch (field.type) {
      case "int": {
        const n = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isInteger(n)) {
          errors.push({ key: field.key, message: "precisa ser inteiro" });
        } else if (
          (field.min !== undefined && n < field.min) ||
          (field.max !== undefined && n > field.max)
        ) {
          errors.push({ key: field.key, message: `fora do intervalo ${field.min}–${field.max}` });
        } else {
          normalized[field.key] = n;
        }
        break;
      }
      case "bool": {
        if (typeof raw !== "boolean") {
          errors.push({ key: field.key, message: "precisa ser true/false" });
        } else {
          normalized[field.key] = raw;
        }
        break;
      }
      case "timeList": {
        const s = String(raw).replace(/\s/g, "");
        if (!TIME_LIST_RE.test(s)) {
          errors.push({ key: field.key, message: "formato: HH:MM,HH:MM (00:00–23:59)" });
        } else {
          normalized[field.key] = s;
        }
        break;
      }
      case "rewardList": {
        const s = String(raw).replace(/\s/g, "");
        if (!REWARD_LIST_RE.test(s)) {
          errors.push({ key: field.key, message: "formato: itemId,qtd ou itemId-qtd (múltiplos com ;)" });
        } else {
          normalized[field.key] = s;
        }
        break;
      }
      case "text": {
        const s = String(raw).trim();
        if (!TEXT_SAFE_RE.test(s)) {
          errors.push({ key: field.key, message: "caracteres inválidos ou vazio" });
        } else {
          normalized[field.key] = s;
        }
        break;
      }
    }
  }
  return { errors, normalized };
}

/**
 * Converte valor normalizado pro formato literal do .properties.
 * Booleans viram True/False (aCis usa Boolean.parseBoolean — case ok,
 * mas True/False segue o estilo dos arquivos originais).
 */
export function toPropertiesValue(v: number | boolean | string): string {
  if (typeof v === "boolean") return v ? "True" : "False";
  return String(v);
}
