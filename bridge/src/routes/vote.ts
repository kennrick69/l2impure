/**
 * Vote system — callbacks dos sites de voto + /vote/check do gameserver.
 *
 * Endpoints (todos públicos — auth interna por endpoint, sem HMAC global):
 *   GET  /vote/callback/hopzone?userid=X&hash=H
 *        → valida HMAC(userid:hopzone, HMAC_SECRET) → grava em vote_pending
 *   POST /vote/callback/l2topco  body: userid=X&userip=Y&voted=1
 *        → valida IP whitelist (env L2TOP_CO_WHITELIST_IPS) → grava → responde "OK" texto
 *   GET  /vote/callback/mmotop?userid=X&code=Y
 *        → valida code == MD5(MMOTOP_SECRET + userid) → grava
 *   GET  /vote/callback/l2servera?userId=X&hash=H
 *        → valida hash == SHA256(L2SERVERA_SECRET + userId) → grava
 *   POST /vote/callback/gtop100  (pingback oficial GTop100)
 *        → valida pingbackkey == GTOP100_PINGBACK_KEY; charId vem do
 *          pingUsername (vote URL: ?vote=1&pingUsername=<charId>);
 *          Successful == 0 → voto válido. Aceita form-urlencoded e o
 *          formato JSON {siteid, pingbackkey, Common:[{pb_name, success}]}.
 *   GET  /vote/check?site=X&charId=Y&ts=Z&sig=H
 *        → game server consulta voto pendente; sig=HMAC(querystring, HMAC_SECRET)
 *        → marca claimed=1 + popula vote_cooldown
 *   GET  /vote/history/:charId  (autenticado — pra painel)
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
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

// Secrets por site — opcionais no boot (bridge sobe sem eles); callback do
// site correspondente responde 503 not_configured até serem setados no .env.
const MMOTOP_SECRET = process.env.MMOTOP_SECRET || "";
const L2SERVERA_SECRET = process.env.L2SERVERA_SECRET || "";
const GTOP100_PINGBACK_KEY = process.env.GTOP100_PINGBACK_KEY || "";

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

  // Helper comum dos callbacks novos: valida charId + site ativo + insere.
  // Retorna [httpStatus, body] — caller decide o content-type da resposta.
  async function acceptVote(
    site: string,
    rawCharId: string,
    ip: string,
    logPayload: string,
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    const charId = parseInt(rawCharId, 10);
    if (!Number.isFinite(charId) || charId <= 0) {
      await logCallback(site, logPayload, ip, "invalid_userid");
      return { status: 400, body: { error: "invalid_userid" } };
    }
    if (await siteDisabled(site)) {
      await logCallback(site, logPayload, ip, "site_disabled");
      return { status: 403, body: { error: "site_disabled" } };
    }
    await pool.query(
      "INSERT INTO vote_pending (site, char_id, ip, claimed) VALUES (?, ?, ?, 0)",
      [site, charId, ip],
    );
    await logCallback(site, logPayload, ip, "ok");
    return { status: 200, body: { ok: true } };
  }

  // ===== MMOTOP — GET callback =====
  // Vote URL cadastrada no mmotop aponta pra cá com ?userid=<charId>&code=<md5>
  // code = MD5(MMOTOP_SECRET + userid). Secret cadastrado no painel mmotop.
  app.get<{ Querystring: { userid?: string; code?: string } }>(
    "/vote/callback/mmotop",
    async (req, reply) => {
      const { userid, code } = req.query;
      const ip =
        (req.headers["cf-connecting-ip"] as string | undefined) ?? req.ip;
      const logPayload = JSON.stringify(req.query);

      if (!MMOTOP_SECRET) {
        await logCallback("mmotop", logPayload, ip, "not_configured");
        reply.code(503).send({ error: "not_configured" });
        return;
      }
      if (!userid || !code) {
        await logCallback("mmotop", logPayload, ip, "missing_params");
        reply.code(400).send({ error: "missing_params" });
        return;
      }
      const expected = createHash("md5")
        .update(`${MMOTOP_SECRET}${userid}`)
        .digest("hex");
      if (!safeEq(code.toLowerCase(), expected)) {
        await logCallback("mmotop", logPayload, ip, "invalid_code");
        req.log.warn({ userid }, "[vote] invalid mmotop code");
        reply.code(403).send({ error: "invalid_code" });
        return;
      }
      try {
        const r = await acceptVote("mmotop", userid, ip, logPayload);
        reply.code(r.status).send(r.body);
      } catch (e) {
        req.log.error({ err: e }, "[vote] mmotop insert failed");
        reply.code(500).send({ error: "db_error" });
      }
    },
  );

  // ===== L2SERVERA — GET callback =====
  // ?userId=<charId>&hash=<sha256>, hash = SHA256(L2SERVERA_SECRET + userId)
  app.get<{ Querystring: { userId?: string; hash?: string } }>(
    "/vote/callback/l2servera",
    async (req, reply) => {
      const { userId, hash } = req.query;
      const ip =
        (req.headers["cf-connecting-ip"] as string | undefined) ?? req.ip;
      const logPayload = JSON.stringify(req.query);

      if (!L2SERVERA_SECRET) {
        await logCallback("l2servera", logPayload, ip, "not_configured");
        reply.code(503).send({ error: "not_configured" });
        return;
      }
      if (!userId || !hash) {
        await logCallback("l2servera", logPayload, ip, "missing_params");
        reply.code(400).send({ error: "missing_params" });
        return;
      }
      const expected = createHash("sha256")
        .update(`${L2SERVERA_SECRET}${userId}`)
        .digest("hex");
      if (!safeEq(hash.toLowerCase(), expected)) {
        await logCallback("l2servera", logPayload, ip, "invalid_hash");
        req.log.warn({ userId }, "[vote] invalid l2servera hash");
        reply.code(403).send({ error: "invalid_hash" });
        return;
      }
      try {
        const r = await acceptVote("l2servera", userId, ip, logPayload);
        reply.code(r.status).send(r.body);
      } catch (e) {
        req.log.error({ err: e }, "[vote] l2servera insert failed");
        reply.code(500).send({ error: "db_error" });
      }
    },
  );

  // ===== GTOP100 — POST pingback =====
  // Contrato oficial (gtop100.com/test/pingback):
  //   form: VoterIP, Successful (0 = voto contou), Reason, pingUsername,
  //         pingbackkey (secret configurado no painel GTop100)
  //   json: { siteid, pingbackkey, Common: [{ ip, success, reason, pb_name }] }
  // pingUsername/pb_name carrega o charId (vote URL: ?vote=1&pingUsername=ID).
  // NOTA: a doc atual do GTop100 valida por pingbackkey; o antigo
  // user_vote_check.php (dupla verificação) não consta mais na doc — a
  // autenticação aqui é o pingbackkey (shared secret, mesma força do resto).
  app.post<{ Body: Record<string, unknown> }>(
    "/vote/callback/gtop100",
    async (req, reply) => {
      const body = (req.body || {}) as Record<string, unknown>;
      const ip =
        (req.headers["cf-connecting-ip"] as string | undefined) ?? req.ip;
      const logPayload = JSON.stringify(body).slice(0, 2000);

      if (!GTOP100_PINGBACK_KEY) {
        await logCallback("gtop100", logPayload, ip, "not_configured");
        reply.code(503).send({ error: "not_configured" });
        return;
      }

      const key = typeof body.pingbackkey === "string" ? body.pingbackkey : "";
      if (!key || !safeEq(key, GTOP100_PINGBACK_KEY)) {
        await logCallback("gtop100", logPayload, ip, "invalid_pingbackkey");
        req.log.warn("[vote] gtop100 pingbackkey inválido");
        reply.code(403).send({ error: "invalid_pingbackkey" });
        return;
      }

      // Normaliza os dois formatos pra uma lista de {charId, success, voterIp}
      type Entry = { rawCharId: string; success: boolean; voterIp: string };
      const entries: Entry[] = [];
      if (Array.isArray(body.Common)) {
        for (const item of body.Common as Array<Record<string, unknown>>) {
          if (!item || typeof item !== "object") continue;
          entries.push({
            rawCharId: String(item.pb_name ?? ""),
            success: Number(item.success ?? -1) === 0,
            voterIp: typeof item.ip === "string" ? item.ip : ip,
          });
        }
      } else {
        entries.push({
          rawCharId: String(body.pingUsername ?? ""),
          success: Number(body.Successful ?? -1) === 0,
          voterIp: typeof body.VoterIP === "string" ? body.VoterIP : ip,
        });
      }

      let accepted = 0;
      try {
        for (const e of entries) {
          if (!e.success) {
            await logCallback("gtop100", logPayload, ip, "vote_not_successful");
            continue;
          }
          const r = await acceptVote("gtop100", e.rawCharId, e.voterIp, logPayload);
          if (r.status === 200) accepted++;
        }
        reply.type("text/plain").send(accepted > 0 ? "OK" : "NO_VALID_VOTES");
      } catch (e) {
        req.log.error({ err: e }, "[vote] gtop100 insert failed");
        reply.code(500).send({ error: "db_error" });
      }
    },
  );

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
      // Claim atômico anti-dupe: colapsa o antigo SELECT-then-UPDATE (TOCTOU)
      // em UMA única statement guardada. Duas /vote/check concorrentes pro
      // mesmo char antes davam ambas ok:true → o game server creditava a coin
      // 2×. Agora só o request cujo UPDATE alterou de fato a linha
      // (affectedRows === 1) recebe ok:true; o perdedor cai em no_pending_vote.
      const [res] = await pool.query(
        "UPDATE vote_pending SET claimed = 1, claimed_at = NOW() " +
          "WHERE site = ? AND char_id = ? AND claimed = 0 " +
          "ORDER BY voted_at DESC LIMIT 1",
        [site, charIdNum],
      );
      const affected = (res as { affectedRows?: number }).affectedRows ?? 0;
      if (affected < 1) {
        reply.send({ ok: false, reason: "no_pending_vote" });
        return;
      }

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
