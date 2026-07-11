/**
 * Vote system — callbacks dos sites de voto + /vote/check do gameserver.
 *
 * Endpoints (todos públicos — auth interna por endpoint, sem HMAC global):
 *   GET  /vote/callback/hopzone?userid=X&hash=H
 *        → valida HMAC(userid:hopzone, HMAC_SECRET) → grava em vote_pending
 *   POST /vote/callback/l2topco  body: userid=X&userip=Y&voted=1
 *        → valida IP whitelist (env L2TOP_CO_WHITELIST_IPS) → grava → responde "OK" texto
 *   GET  /vote/check?site=X&charId=Y&ts=Z&sig=H
 *        → game server consulta voto pendente; sig=HMAC(querystring, HMAC_SECRET)
 *        → marca claimed=1 + popula vote_cooldown
 *   GET  /vote/history/:charId  (autenticado — pra painel)
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";
import { env } from "../env.js";
import { authenticate } from "../auth.js";
import { getVoteSiteConfig } from "../vote-config.js";

/**
 * true = site desabilitado no painel admin → callback deve ser recusado.
 * Config desconhecida (site fora do ar / slug não cadastrado) = fail-open,
 * ver vote-config.ts.
 */
async function siteDisabled(slug: string): Promise<boolean> {
  const cfg = await getVoteSiteConfig(slug);
  return cfg !== null && !cfg.active;
}

const L2TOP_CO_WHITELIST = (process.env.L2TOP_CO_WHITELIST_IPS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function hmacHex(data: string): string {
  return createHmac("sha256", env.HMAC_SECRET).update(data).digest("hex");
}

function safeEq(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

async function logCallback(
  site: string,
  payload: string,
  ip: string,
  status: string,
): Promise<void> {
  try {
    await pool.query(
      "INSERT INTO vote_callback_log (site, payload, ip, status) VALUES (?, ?, ?, ?)",
      [site, payload, ip, status],
    );
  } catch {
    // log-only table — silenciar se falhar
  }
}

export async function voteRoutes(app: FastifyInstance) {
  // ===== HOPZONE — GET callback =====
  app.get<{ Querystring: { userid?: string; hash?: string } }>(
    "/vote/callback/hopzone",
    async (req, reply) => {
      const { userid, hash } = req.query;
      const ip =
        (req.headers["cf-connecting-ip"] as string | undefined) ?? req.ip;

      if (!userid || !hash) {
        await logCallback(
          "hopzone",
          JSON.stringify(req.query),
          ip,
          "missing_params",
        );
        reply.code(400).send({ error: "missing_params" });
        return;
      }

      const expected = hmacHex(`${userid}:hopzone`);
      if (!safeEq(hash, expected)) {
        await logCallback(
          "hopzone",
          JSON.stringify(req.query),
          ip,
          "invalid_hash",
        );
        req.log.warn({ userid, hash }, "[vote] invalid hopzone HMAC");
        reply.code(403).send({ error: "invalid_hash" });
        return;
      }

      const charId = parseInt(userid, 10);
      if (!Number.isFinite(charId)) {
        reply.code(400).send({ error: "invalid_userid" });
        return;
      }

      // Painel admin controla ativação (tabela vote_sites no site)
      if (await siteDisabled("hopzone")) {
        await logCallback(
          "hopzone",
          JSON.stringify(req.query),
          ip,
          "site_disabled",
        );
        req.log.warn({ charId }, "[vote] hopzone desativado no painel admin");
        reply.code(403).send({ error: "site_disabled" });
        return;
      }

      try {
        await pool.query(
          "INSERT INTO vote_pending (site, char_id, ip, claimed) VALUES (?, ?, ?, 0)",
          ["hopzone", charId, ip],
        );
        await logCallback(
          "hopzone",
          JSON.stringify(req.query),
          ip,
          "ok",
        );
        reply.send({ ok: true });
      } catch (e) {
        req.log.error({ err: e }, "[vote] hopzone insert failed");
        reply.code(500).send({ error: "db_error" });
      }
    },
  );

  // ===== L2TOP.CO — POST callback =====
  app.post<{
    Body: { userid?: string; userip?: string; voted?: string };
  }>("/vote/callback/l2topco", async (req, reply) => {
    const body = req.body || {};
    const ip =
      (req.headers["cf-connecting-ip"] as string | undefined) ?? req.ip;

    await logCallback(
      "l2topco",
      JSON.stringify(body),
      ip,
      "received",
    );

    if (
      L2TOP_CO_WHITELIST.length > 0 &&
      !L2TOP_CO_WHITELIST.includes(ip)
    ) {
      req.log.warn(
        { ip, userid: body.userid },
        "[vote] l2topco from non-whitelisted IP",
      );
      reply.code(403).send({ error: "ip_not_whitelisted" });
      return;
    }

    const charId = body.userid ? parseInt(body.userid, 10) : NaN;
    const voted = body.voted ? parseInt(body.voted, 10) : 0;
    if (!Number.isFinite(charId) || voted !== 1) {
      reply.code(400).send({ error: "invalid_payload" });
      return;
    }

    // Painel admin controla ativação (tabela vote_sites no site)
    if (await siteDisabled("l2topco")) {
      await logCallback("l2topco", JSON.stringify(body), ip, "site_disabled");
      req.log.warn({ charId }, "[vote] l2topco desativado no painel admin");
      reply.code(403).send({ error: "site_disabled" });
      return;
    }

    try {
      await pool.query(
        "INSERT INTO vote_pending (site, char_id, ip, claimed) VALUES (?, ?, ?, 0)",
        ["l2topco", charId, body.userip ?? ip],
      );
      // L2Top.CO espera "OK" em texto plano
      reply.type("text/plain").send("OK");
    } catch (e) {
      req.log.error({ err: e }, "[vote] l2topco insert failed");
      reply.code(500).send({ error: "db_error" });
    }
  });

  // ===== Game server consulta voto pendente =====
  app.get<{
    Querystring: {
      site?: string;
      charId?: string;
      ts?: string;
      sig?: string;
    };
  }>("/vote/check", async (req, reply) => {
    const { site, charId, ts, sig } = req.query;
    if (!site || !charId || !ts || !sig) {
      reply.code(400).send({ ok: false, error: "missing_params" });
      return;
    }

    const body = `site=${site}&charId=${charId}&ts=${ts}`;
    const expected = hmacHex(body);
    if (!safeEq(sig, expected)) {
      reply.code(403).send({ ok: false, error: "invalid_sig" });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const tsNum = parseInt(ts, 10);
    if (!Number.isFinite(tsNum) || Math.abs(now - tsNum) > 30) {
      reply.code(403).send({ ok: false, error: "expired" });
      return;
    }

    const charIdNum = parseInt(charId, 10);
    if (!Number.isFinite(charIdNum)) {
      reply.code(400).send({ ok: false, error: "invalid_charid" });
      return;
    }

    try {
      const [rows] = await pool.query(
        "SELECT id FROM vote_pending WHERE site = ? AND char_id = ? AND claimed = 0 ORDER BY voted_at DESC LIMIT 1",
        [site, charIdNum],
      );
      const list = rows as Array<{ id: number }>;
      if (list.length === 0) {
        reply.send({ ok: false, reason: "no_pending_vote" });
        return;
      }

      await pool.query(
        "UPDATE vote_pending SET claimed = 1, claimed_at = NOW() WHERE id = ?",
        [list[0]!.id],
      );
      await pool.query(
        "INSERT INTO vote_cooldown (char_id, site, last_vote) VALUES (?, ?, NOW()) " +
          "ON DUPLICATE KEY UPDATE last_vote = NOW()",
        [charIdNum, site],
      );
      reply.send({ ok: true });
    } catch (e) {
      req.log.error({ err: e }, "[vote] /vote/check db failed");
      reply.code(500).send({ ok: false, error: "db_error" });
    }
  });

  // ===== Histórico (admin/painel — autenticado) =====
  app.get<{ Params: { charId: string } }>(
    "/vote/history/:charId",
    { preHandler: authenticate },
    async (req, reply) => {
      const charId = parseInt(req.params.charId, 10);
      if (!Number.isFinite(charId)) {
        reply.code(400).send({ error: "invalid_charid" });
        return;
      }
      try {
        const [rows] = await pool.query(
          "SELECT site, voted_at, claimed, claimed_at, ip FROM vote_pending WHERE char_id = ? ORDER BY voted_at DESC LIMIT 50",
          [charId],
        );
        reply.send({ history: rows });
      } catch (e) {
        req.log.error({ err: e }, "[vote] history failed");
        reply.code(500).send({ error: "db_error" });
      }
    },
  );
}
