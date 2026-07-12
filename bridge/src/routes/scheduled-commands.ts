/**
 * Comandos GM agendados (tabela scheduled_gm_commands, migration 006).
 *
 * O site cria/lista/cancela via HMAC; quem DISPARA é o scheduler da bridge
 * (src/scheduler.ts, tick 30s): quando scheduled_at <= NOW() ele insere o
 * comando na gm_commands e o fluxo vira o normal da fila (gameserver polla).
 *
 *   POST   /scheduled-commands      {type, payload, requestedBy, scheduledAt}
 *   GET    /scheduled-commands?status=pending|fired|cancelled&limit=50
 *   DELETE /scheduled-commands/:id  (cancela — só se ainda pending)
 *
 * Timezone: scheduledAt chega como ISO 8601 (UTC); MySQL da VPS roda em UTC,
 * então NOW() e a comparação do scheduler são consistentes. Exibição em BRT
 * é responsabilidade da UI do site.
 */
import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";
import { authenticate } from "../auth.js";

/** Mesma validação de forma do POST /gm-commands — semântica fica no site (zod). */
const TYPE_RE = /^[a-z][a-z0-9_]{1,31}$/;

/** Máximo de 370 dias no futuro — agendamento além disso é quase certeza de erro. */
const MAX_FUTURE_MS = 370 * 24 * 3600 * 1000;
/** Tolerância pra relógio do cliente: até 60s no passado ainda aceita (dispara no próximo tick). */
const PAST_GRACE_MS = 60_000;

type ScheduledRow = {
  id: number;
  type: string;
  payload: unknown;
  requested_by: string;
  requested_at: string | Date;
  scheduled_at: string | Date;
  fired_at: string | Date | null;
  gm_command_id: number | null;
  cancelled_at: string | Date | null;
};

function iso(v: string | Date | null): string | null {
  if (v === null) return null;
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

function parseJsonCol(v: unknown): unknown {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function toDto(row: ScheduledRow) {
  const status = row.cancelled_at
    ? "cancelled"
    : row.fired_at
      ? "fired"
      : "pending";
  return {
    id: row.id,
    type: row.type,
    payload: parseJsonCol(row.payload),
    requestedBy: row.requested_by,
    requestedAt: iso(row.requested_at),
    scheduledAt: iso(row.scheduled_at),
    firedAt: iso(row.fired_at),
    gmCommandId: row.gm_command_id,
    cancelledAt: iso(row.cancelled_at),
    status,
  };
}

export async function scheduledCommandRoutes(app: FastifyInstance) {
  // ===== SITE: agendar =====
  app.post<{
    Body: {
      type?: string;
      payload?: unknown;
      requestedBy?: string;
      scheduledAt?: string;
    };
  }>("/scheduled-commands", { preHandler: authenticate }, async (req, reply) => {
    const { type, payload, requestedBy, scheduledAt } = req.body || {};

    if (typeof type !== "string" || !TYPE_RE.test(type)) {
      reply.code(400).send({ error: "invalid_type" });
      return;
    }
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
      reply.code(400).send({ error: "invalid_payload" });
      return;
    }
    const payloadJson = JSON.stringify(payload);
    if (payloadJson.length > 8192) {
      reply.code(400).send({ error: "payload_too_large" });
      return;
    }
    if (typeof requestedBy !== "string" || requestedBy.length === 0 || requestedBy.length > 128) {
      reply.code(400).send({ error: "invalid_requested_by" });
      return;
    }
    if (typeof scheduledAt !== "string") {
      reply.code(400).send({ error: "invalid_scheduled_at" });
      return;
    }
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      reply.code(400).send({ error: "invalid_scheduled_at" });
      return;
    }
    const delta = when.getTime() - Date.now();
    if (delta < -PAST_GRACE_MS) {
      reply.code(400).send({ error: "scheduled_at_in_past" });
      return;
    }
    if (delta > MAX_FUTURE_MS) {
      reply.code(400).send({ error: "scheduled_at_too_far" });
      return;
    }

    try {
      const [res] = await pool.query(
        "INSERT INTO scheduled_gm_commands (type, payload, requested_by, scheduled_at) VALUES (?, ?, ?, ?)",
        [type, payloadJson, requestedBy, when],
      );
      const id = (res as { insertId: number }).insertId;
      req.log.info(
        { id, type, requestedBy, scheduledAt: when.toISOString() },
        "[scheduled-commands] agendado",
      );
      reply.code(201).send({
        ok: true,
        scheduled: { id, type, scheduledAt: when.toISOString(), status: "pending" },
      });
    } catch (e) {
      req.log.error({ err: e }, "[scheduled-commands] insert failed");
      reply.code(500).send({ error: "db_error" });
    }
  });

  // ===== SITE: listar =====
  app.get<{ Querystring: { status?: string; limit?: string } }>(
    "/scheduled-commands",
    { preHandler: authenticate },
    async (req, reply) => {
      const status = req.query.status;
      if (status && !["pending", "fired", "cancelled"].includes(status)) {
        reply.code(400).send({ error: "invalid_status" });
        return;
      }
      const limit = Math.min(
        Math.max(parseInt(req.query.limit ?? "50", 10) || 50, 1),
        200,
      );
      const whereSql =
        status === "pending"
          ? "WHERE fired_at IS NULL AND cancelled_at IS NULL"
          : status === "fired"
            ? "WHERE fired_at IS NOT NULL"
            : status === "cancelled"
              ? "WHERE cancelled_at IS NOT NULL"
              : "";
      try {
        const [rows] = await pool.query(
          `SELECT * FROM scheduled_gm_commands ${whereSql} ORDER BY id DESC LIMIT ?`,
          [limit],
        );
        reply.send({ scheduled: (rows as ScheduledRow[]).map(toDto) });
      } catch (e) {
        req.log.error({ err: e }, "[scheduled-commands] list failed");
        reply.code(500).send({ error: "db_error" });
      }
    },
  );

  // ===== SITE: cancelar =====
  app.delete<{ Params: { id: string } }>(
    "/scheduled-commands/:id",
    { preHandler: authenticate },
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id) || id <= 0) {
        reply.code(400).send({ error: "invalid_id" });
        return;
      }
      try {
        const [res] = await pool.query(
          "UPDATE scheduled_gm_commands SET cancelled_at = NOW() " +
            "WHERE id = ? AND fired_at IS NULL AND cancelled_at IS NULL",
          [id],
        );
        const affected = (res as { affectedRows: number }).affectedRows;
        if (affected === 0) {
          // já disparado, já cancelado ou inexistente
          reply.code(409).send({ error: "not_cancellable" });
          return;
        }
        req.log.info({ id }, "[scheduled-commands] cancelado");
        reply.send({ ok: true });
      } catch (e) {
        req.log.error({ err: e }, "[scheduled-commands] cancel failed");
        reply.code(500).send({ error: "db_error" });
      }
    },
  );
}
