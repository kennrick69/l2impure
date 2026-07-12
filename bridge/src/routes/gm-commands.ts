/**
 * Fila de comandos GM — o painel admin cria comandos, o gameserver polla
 * e executa. Elimina a necessidade de logar como GM in-game pra operar.
 *
 * Fluxo (mesmo padrão INVERSO do vote system — gameserver polla a bridge):
 *   site (POST /gm-commands, HMAC headers)     → status pending
 *   gameserver (GET /gm-commands/pending)      → pending vira running
 *   gameserver executa e reporta
 *   gameserver (POST /gm-commands/:id/result)  → running vira done|failed
 *
 * Endpoints site-facing (preHandler authenticate — HMAC de headers,
 * mesmo contrato de src/lib/bridge.ts no Next):
 *   POST /gm-commands            {type, payload, requestedBy, priority?}
 *   GET  /gm-commands?limit=&status=
 *   GET  /gm-commands/:id
 *
 * Endpoints gameserver-facing (HMAC de querystring, mesmo estilo do
 * /vote/check — ts em SEGUNDOS, janela 30s):
 *   GET  /gm-commands/pending?limit=10&ts=T&sig=H
 *        sig = hex(HMAC-SHA256("limit=10&ts=T", HMAC_SECRET))
 *        → marca os retornados como running
 *        → recovery: running há mais de STALE_RUNNING_S vira failed
 *   POST /gm-commands/:id/result?ts=T&sig=H   body JSON {ok, message?}
 *        sig = hex(HMAC-SHA256("id=I&ts=T." + rawBody, HMAC_SECRET))
 *
 * Handler Java no fork L2J ainda não existe (P0 próxima rodada) —
 * comandos ficam pending até lá. Contrato definido AQUI é o canônico.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { pool } from "../db.js";
import { env } from "../env.js";
import { authenticate } from "../auth.js";

/** running sem resultado além disso = gameserver morreu no meio → failed */
const STALE_RUNNING_S = 120;

const VALID_STATUS = ["pending", "running", "done", "failed"] as const;
type CommandStatus = (typeof VALID_STATUS)[number];

type GmCommandRow = {
  id: number;
  type: string;
  payload: unknown;
  status: CommandStatus;
  priority: number;
  requested_by: string;
  requested_at: string;
  started_at: string | null;
  executed_at: string | null;
  result: unknown;
};

function hmacHex(data: string): string {
  return createHmac("sha256", env.HMAC_SECRET).update(data).digest("hex");
}

function safeEq(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function tsFresh(ts: string | undefined): boolean {
  if (!ts) return false;
  const tsNum = parseInt(ts, 10);
  if (!Number.isFinite(tsNum)) return false;
  return Math.abs(Math.floor(Date.now() / 1000) - tsNum) <= 30;
}

/** payload JSON do MySQL pode vir string ou objeto dependendo do driver */
function parseJsonCol(v: unknown): unknown {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function toDto(row: GmCommandRow) {
  return {
    id: row.id,
    type: row.type,
    payload: parseJsonCol(row.payload),
    status: row.status,
    priority: row.priority,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    startedAt: row.started_at,
    executedAt: row.executed_at,
    result: parseJsonCol(row.result),
  };
}

export async function gmCommandRoutes(app: FastifyInstance) {
  // ===== SITE: criar comando =====
  app.post<{
    Body: {
      type?: string;
      payload?: unknown;
      requestedBy?: string;
      priority?: number;
    };
  }>("/gm-commands", { preHandler: authenticate }, async (req, reply) => {
    const { type, payload, requestedBy } = req.body || {};
    const priority = Number(req.body?.priority ?? 0);

    // Validação de FORMA — a semântica por tipo é validada no site (zod).
    if (typeof type !== "string" || !/^[a-z][a-z0-9_]{1,31}$/.test(type)) {
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
    if (!Number.isInteger(priority) || priority < 0 || priority > 100) {
      reply.code(400).send({ error: "invalid_priority" });
      return;
    }

    try {
      const [res] = await pool.query(
        "INSERT INTO gm_commands (type, payload, requested_by, priority) VALUES (?, ?, ?, ?)",
        [type, payloadJson, requestedBy, priority],
      );
      const id = (res as { insertId: number }).insertId;
      req.log.info({ id, type, requestedBy }, "[gm-commands] criado");
      reply.code(201).send({ ok: true, command: { id, type, status: "pending" } });
    } catch (e) {
      req.log.error({ err: e }, "[gm-commands] insert failed");
      reply.code(500).send({ error: "db_error" });
    }
  });

  // ===== SITE: listar =====
  app.get<{ Querystring: { limit?: string; status?: string } }>(
    "/gm-commands",
    { preHandler: authenticate },
    async (req, reply) => {
      const limit = Math.min(
        Math.max(parseInt(req.query.limit ?? "50", 10) || 50, 1),
        200,
      );
      const status = req.query.status;
      if (status && !VALID_STATUS.includes(status as CommandStatus)) {
        reply.code(400).send({ error: "invalid_status" });
        return;
      }
      try {
        const [rows] = status
          ? await pool.query(
              "SELECT * FROM gm_commands WHERE status = ? ORDER BY id DESC LIMIT ?",
              [status, limit],
            )
          : await pool.query(
              "SELECT * FROM gm_commands ORDER BY id DESC LIMIT ?",
              [limit],
            );
        reply.send({ commands: (rows as GmCommandRow[]).map(toDto) });
      } catch (e) {
        req.log.error({ err: e }, "[gm-commands] list failed");
        reply.code(500).send({ error: "db_error" });
      }
    },
  );

  // ===== GAMESERVER: pollar pendentes =====
  // Registrado ANTES de /gm-commands/:id não é necessário — Fastify dá
  // precedência a rota estática sobre paramétrica.
  app.get<{ Querystring: { limit?: string; ts?: string; sig?: string } }>(
    "/gm-commands/pending",
    async (req, reply) => {
      const { limit = "10", ts, sig } = req.query;
      if (!ts || !sig) {
        reply.code(400).send({ ok: false, error: "missing_params" });
        return;
      }
      const expected = hmacHex(`limit=${limit}&ts=${ts}`);
      if (!safeEq(sig, expected)) {
        reply.code(403).send({ ok: false, error: "invalid_sig" });
        return;
      }
      if (!tsFresh(ts)) {
        reply.code(403).send({ ok: false, error: "expired" });
        return;
      }
      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

      const conn = await pool.getConnection();
      try {
        // Recovery: running órfão (gameserver caiu no meio) → failed
        await conn.query(
          "UPDATE gm_commands SET status = 'failed', executed_at = NOW(), " +
            "result = JSON_OBJECT('ok', false, 'message', 'timeout: gameserver não reportou resultado') " +
            "WHERE status = 'running' AND started_at < NOW() - INTERVAL ? SECOND",
          [STALE_RUNNING_S],
        );

        await conn.beginTransaction();
        const [rows] = await conn.query(
          "SELECT * FROM gm_commands WHERE status = 'pending' " +
            "ORDER BY priority DESC, id ASC LIMIT ? FOR UPDATE",
          [limitNum],
        );
        const list = rows as GmCommandRow[];
        if (list.length > 0) {
          await conn.query(
            "UPDATE gm_commands SET status = 'running', started_at = NOW() WHERE id IN (?)",
            [list.map((r) => r.id)],
          );
        }
        await conn.commit();
        reply.send({
          ok: true,
          commands: list.map((r) => ({
            id: r.id,
            type: r.type,
            payload: parseJsonCol(r.payload),
            priority: r.priority,
            // aditivo (2026-07-12): ban_account usa como banned_by no
            // histórico account_bans. Poller antigo ignora sem quebrar.
            requestedBy: r.requested_by,
          })),
        });
      } catch (e) {
        await conn.rollback().catch(() => {});
        req.log.error({ err: e }, "[gm-commands] pending poll failed");
        reply.code(500).send({ ok: false, error: "db_error" });
      } finally {
        conn.release();
      }
    },
  );

  // ===== GAMESERVER: reportar resultado =====
  app.post<{
    Params: { id: string };
    Querystring: { ts?: string; sig?: string };
    Body: { ok?: boolean; message?: string };
  }>("/gm-commands/:id/result", async (req, reply) => {
    const { ts, sig } = req.query;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      reply.code(400).send({ ok: false, error: "invalid_id" });
      return;
    }
    if (!ts || !sig) {
      reply.code(400).send({ ok: false, error: "missing_params" });
      return;
    }
    const rawBody =
      (req as FastifyRequest & { rawBody?: string }).rawBody ?? "";
    const expected = hmacHex(`id=${id}&ts=${ts}.${rawBody}`);
    if (!safeEq(sig, expected)) {
      reply.code(403).send({ ok: false, error: "invalid_sig" });
      return;
    }
    if (!tsFresh(ts)) {
      reply.code(403).send({ ok: false, error: "expired" });
      return;
    }

    const body = req.body || {};
    if (typeof body.ok !== "boolean") {
      reply.code(400).send({ ok: false, error: "invalid_body" });
      return;
    }
    const message =
      typeof body.message === "string" ? body.message.slice(0, 2000) : null;

    try {
      const [res] = await pool.query(
        "UPDATE gm_commands SET status = ?, executed_at = NOW(), " +
          "result = JSON_OBJECT('ok', ?, 'message', ?) " +
          "WHERE id = ? AND status = 'running'",
        [body.ok ? "done" : "failed", body.ok, message, id],
      );
      const affected = (res as { affectedRows: number }).affectedRows;
      if (affected === 0) {
        // já resolvido (timeout recovery) ou id inexistente — idempotente
        reply.code(409).send({ ok: false, error: "not_running" });
        return;
      }
      req.log.info({ id, ok: body.ok }, "[gm-commands] resultado recebido");
      reply.send({ ok: true });
    } catch (e) {
      req.log.error({ err: e }, "[gm-commands] result failed");
      reply.code(500).send({ ok: false, error: "db_error" });
    }
  });

  // ===== SITE: detalhe (depois das rotas estáticas) =====
  app.get<{ Params: { id: string } }>(
    "/gm-commands/:id",
    { preHandler: authenticate },
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id) || id <= 0) {
        reply.code(400).send({ error: "invalid_id" });
        return;
      }
      try {
        const [rows] = await pool.query(
          "SELECT * FROM gm_commands WHERE id = ?",
          [id],
        );
        const list = rows as GmCommandRow[];
        if (list.length === 0) {
          reply.code(404).send({ error: "not_found" });
          return;
        }
        reply.send({ command: toDto(list[0]!) });
      } catch (e) {
        req.log.error({ err: e }, "[gm-commands] get failed");
        reply.code(500).send({ error: "db_error" });
      }
    },
  );
}
