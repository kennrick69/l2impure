/**
 * Scheduler da bridge — tick a cada 30s, duas responsabilidades:
 *
 * 1. DISPARO DE COMANDOS AGENDADOS (scheduled_gm_commands, migration 006):
 *    quando scheduled_at <= NOW(), insere o comando na gm_commands (fluxo
 *    normal da fila — gameserver polla em ~5s) e marca fired_at +
 *    gm_command_id. Se o INSERT falhar, o agendamento fica pending e o
 *    próximo tick tenta de novo (nunca marca fired sem ter enfileirado).
 *
 * 2. AUTO-EXPIRE DE BANS TEMPORÁRIOS (account_bans, migration 005):
 *    ban com expires_at <= NOW() e ainda não desbanido → restaura
 *    access_level = 0 / lastServer = 1 na accounts (só se access_level < 0,
 *    pra nunca zerar nível positivo de GM) e fecha o registro com
 *    unbanned_by = 'auto-expire'. Sem isso, durationHours seria cosmético.
 *
 * Timezone: MySQL da VPS roda em UTC — NOW() e os TIMESTAMP são UTC.
 */
import type { FastifyBaseLogger } from "fastify";
import { pool } from "./db.js";

const TICK_MS = 30_000;
const FIRE_BATCH = 20;

type DueRow = {
  id: number;
  type: string;
  payload: unknown;
  requested_by: string;
};

type ExpiredBanRow = {
  id: number;
  account_login: string;
};

let timer: NodeJS.Timeout | null = null;
let running = false;

async function fireDueCommands(log: FastifyBaseLogger): Promise<void> {
  const [rows] = await pool.query(
    "SELECT id, type, payload, requested_by FROM scheduled_gm_commands " +
      "WHERE fired_at IS NULL AND cancelled_at IS NULL AND scheduled_at <= NOW() " +
      "ORDER BY scheduled_at ASC, id ASC LIMIT ?",
    [FIRE_BATCH],
  );
  const due = rows as DueRow[];
  for (const cmd of due) {
    try {
      const payloadJson =
        typeof cmd.payload === "string" ? cmd.payload : JSON.stringify(cmd.payload);
      const [res] = await pool.query(
        "INSERT INTO gm_commands (type, payload, requested_by, priority) VALUES (?, ?, ?, 0)",
        [cmd.type, payloadJson, cmd.requested_by],
      );
      const gmId = (res as { insertId: number }).insertId;
      // Guard fired_at IS NULL: se dois processos disparassem junto, só um marca.
      const [upd] = await pool.query(
        "UPDATE scheduled_gm_commands SET fired_at = NOW(), gm_command_id = ? " +
          "WHERE id = ? AND fired_at IS NULL AND cancelled_at IS NULL",
        [gmId, cmd.id],
      );
      if ((upd as { affectedRows: number }).affectedRows === 0) {
        // corrida raríssima (cancelado entre o SELECT e aqui) — remove o
        // gm_command órfão que acabamos de criar se ainda estiver pending
        await pool.query(
          "DELETE FROM gm_commands WHERE id = ? AND status = 'pending'",
          [gmId],
        );
        log.warn({ scheduledId: cmd.id, gmId }, "[scheduler] agendado sumiu entre SELECT e UPDATE — gm_command revertido");
        continue;
      }
      log.info(
        { scheduledId: cmd.id, gmCommandId: gmId, type: cmd.type, requestedBy: cmd.requested_by },
        "[scheduler] comando agendado disparado → fila gm_commands",
      );
    } catch (e) {
      log.error({ err: e, scheduledId: cmd.id }, "[scheduler] falha ao disparar agendado — retry no próximo tick");
    }
  }
}

async function expireBans(log: FastifyBaseLogger): Promise<void> {
  const [rows] = await pool.query(
    "SELECT id, account_login FROM account_bans " +
      "WHERE expires_at IS NOT NULL AND expires_at <= NOW() AND unbanned_at IS NULL LIMIT 50",
  );
  const expired = rows as ExpiredBanRow[];
  for (const ban of expired) {
    try {
      // Só restaura se ainda estiver negativo — nunca zera nível de GM.
      await pool.query(
        "UPDATE accounts SET access_level = 0, lastServer = 1 WHERE login = ? AND access_level < 0",
        [ban.account_login],
      );
      await pool.query(
        "UPDATE account_bans SET unbanned_at = NOW(), unbanned_by = 'auto-expire' WHERE id = ? AND unbanned_at IS NULL",
        [ban.id],
      );
      log.info({ banId: ban.id, login: ban.account_login }, "[scheduler] ban temporário expirou — conta desbanida");
    } catch (e) {
      log.error({ err: e, banId: ban.id }, "[scheduler] falha no auto-expire — retry no próximo tick");
    }
  }
}

async function tick(log: FastifyBaseLogger): Promise<void> {
  if (running) return; // tick anterior ainda rodando — pula
  running = true;
  try {
    await fireDueCommands(log);
  } catch (e) {
    log.error({ err: e }, "[scheduler] fireDueCommands crashed");
  }
  try {
    await expireBans(log);
  } catch (e) {
    // account_bans pode nem existir ainda (migration 005 pendente) — só loga
    log.error({ err: e }, "[scheduler] expireBans crashed");
  }
  running = false;
}

export const scheduler = {
  start(log: FastifyBaseLogger): void {
    if (timer) return;
    timer = setInterval(() => void tick(log), TICK_MS);
    timer.unref();
    log.info(`[scheduler] ativo — tick a cada ${TICK_MS / 1000}s (scheduled_gm_commands + auto-expire de bans)`);
    // primeiro tick logo no boot (agendados vencidos durante downtime disparam já)
    void tick(log);
  },
  stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  },
};
