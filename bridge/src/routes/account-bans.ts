/**
 * Leitura do histórico de bans de conta (tabela account_bans, migration 005).
 *
 * O ban em si é executado pelo gameserver (GmCommandPoller, tipos
 * ban_account/unban_account da fila gm_commands) — aqui é só a listagem
 * pro painel /admin/moderation/bans do site.
 *
 *   GET /account-bans?status=active|all&limit=50&login=<busca>  (HMAC site)
 *
 * "active" = unbanned_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())
 */
import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";
import { authenticate } from "../auth.js";

type BanRow = {
  id: number;
  account_login: string;
  reason: string;
  banned_by: string;
  banned_at: string | Date;
  expires_at: string | Date | null;
  unbanned_at: string | Date | null;
  unbanned_by: string | null;
  access_level: number | null;
};

function iso(v: string | Date | null): string | null {
  if (v === null) return null;
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

export async function accountBanRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { status?: string; limit?: string; login?: string } }>(
    "/account-bans",
    { preHandler: authenticate },
    async (req, reply) => {
      const status = req.query.status ?? "active";
      if (status !== "active" && status !== "all") {
        reply.code(400).send({ error: "invalid_status" });
        return;
      }
      const limit = Math.min(
        Math.max(parseInt(req.query.limit ?? "50", 10) || 50, 1),
        200,
      );
      const login = (req.query.login ?? "").trim();
      if (login.length > 48) {
        reply.code(400).send({ error: "invalid_login" });
        return;
      }

      const where: string[] = [];
      const params: unknown[] = [];
      if (status === "active") {
        where.push(
          "b.unbanned_at IS NULL AND (b.expires_at IS NULL OR b.expires_at > NOW())",
        );
      }
      if (login) {
        where.push("b.account_login LIKE ?");
        params.push(`%${login}%`);
      }
      const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

      try {
        const [rows] = await pool.query(
          `SELECT b.*, a.access_level
             FROM account_bans b
             LEFT JOIN accounts a ON a.login = b.account_login
             ${whereSql}
             ORDER BY b.id DESC
             LIMIT ?`,
          [...params, limit],
        );
        const list = rows as BanRow[];
        const now = Date.now();
        reply.send({
          bans: list.map((b) => {
            const expiresMs = b.expires_at
              ? new Date(b.expires_at).getTime()
              : null;
            const active =
              b.unbanned_at === null &&
              (expiresMs === null || expiresMs > now);
            return {
              id: b.id,
              accountLogin: b.account_login,
              reason: b.reason,
              bannedBy: b.banned_by,
              bannedAt: iso(b.banned_at),
              expiresAt: iso(b.expires_at),
              unbannedAt: iso(b.unbanned_at),
              unbannedBy: b.unbanned_by,
              accessLevel: b.access_level,
              active,
            };
          }),
        });
      } catch (e) {
        req.log.error({ err: e }, "[account-bans] list failed");
        reply.code(500).send({ error: "db_error" });
      }
    },
  );
}
