import { z } from "zod";

/**
 * Fila de comandos GM — tipos suportados + validação de payload.
 *
 * A fila vive no MySQL da VPS (tabela gm_commands, bridge/migrations/003):
 * o site cria comandos via bridge (HMAC), o gameserver polla
 * GET /gm-commands/pending e reporta o resultado. Diferente das ações do
 * /admin/game-master (escrita direta no MySQL, exigem char OFFLINE),
 * os comandos da fila são executados PELO gameserver rodando — servem
 * exatamente pros casos live: broadcast, kick, dar item com char online.
 *
 * Handler Java no fork L2J ainda não existe (P0 próxima rodada) —
 * até lá os comandos ficam "pending" na fila.
 */

export const GM_COMMAND_DEFS = {
  broadcast: {
    label: "Broadcast",
    description: "Mensagem global pra todos os jogadores online",
    schema: z
      .object({ message: z.string().trim().min(1).max(500) })
      .strict(),
  },
  kick: {
    label: "Kick",
    description: "Desconecta um personagem online",
    schema: z
      .object({ charName: z.string().trim().min(1).max(35) })
      .strict(),
  },
  give_item: {
    label: "Dar item (online)",
    description: "Entrega item a um personagem ONLINE (offline use o Game master)",
    schema: z
      .object({
        charName: z.string().trim().min(1).max(35),
        itemId: z.coerce.number().int().positive(),
        count: z.coerce.number().int().min(1).max(1_000_000),
      })
      .strict(),
  },
  announcement_broadcast: {
    label: "Anúncio (site + in-game)",
    description:
      "Publica no site E faz shout in-game (o insert em announcements é feito pelo site; o gameserver só faz o shout)",
    schema: z
      .object({
        title: z.string().trim().min(1).max(80),
        message: z.string().trim().min(1).max(500),
        persistOnSite: z.boolean().default(true),
      })
      .strict(),
  },
  ban_account: {
    label: "Banir conta",
    description:
      "Desconecta sessão ativa + seta access_level negativo na accounts (bloqueia login)",
    schema: z
      .object({
        accountLogin: z.string().trim().min(3).max(48),
        reason: z.string().trim().min(1).max(200),
        // até 10 anos; omitido = permanente
        durationHours: z.coerce.number().int().min(1).max(87600).optional(),
      })
      .strict(),
  },
  unban_account: {
    label: "Desbanir conta",
    description: "Restaura access_level = 0 (volta a poder logar)",
    schema: z
      .object({
        accountLogin: z.string().trim().min(3).max(48),
      })
      .strict(),
  },
} as const;

export type GmCommandType = keyof typeof GM_COMMAND_DEFS;

export const GM_COMMAND_TYPES = Object.keys(
  GM_COMMAND_DEFS,
) as GmCommandType[];

export function isGmCommandType(t: string): t is GmCommandType {
  return t in GM_COMMAND_DEFS;
}

export type GmCommandStatus = "pending" | "running" | "done" | "failed";

/** DTO devolvido pela bridge (GET /gm-commands e /gm-commands/:id) */
export type GmCommandDto = {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  status: GmCommandStatus;
  priority: number;
  requestedBy: string;
  requestedAt: string;
  startedAt: string | null;
  executedAt: string | null;
  result: { ok: boolean; message: string | null } | null;
};
