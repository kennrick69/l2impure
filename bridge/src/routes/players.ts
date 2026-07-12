/**
 * Jogadores online em tempo real (admin). Consumido pelo painel
 * /admin/online do site (auto-refresh 5s), sempre via HMAC.
 *
 * READ-ONLY: nenhuma mutação aqui — kick e afins vão pela fila
 * gm_commands (rotas gm-commands.ts).
 */
import type { FastifyInstance } from "fastify";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "../db.js";
import { authenticate } from "../auth.js";
import { classIdToName } from "../l2j.js";

const OnlineQuery = z.object({
  search: z.string().max(45).optional(),
  levelMin: z.coerce.number().int().min(0).max(127).optional(),
  levelMax: z.coerce.number().int().min(0).max(127).optional(),
  classId: z.coerce.number().int().min(0).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

type OnlineRow = {
  obj_Id: number;
  char_name: string;
  level: number;
  classid: number;
  x: number;
  y: number;
  z: number;
  onlinetime: number;
  lastAccess: number;
  account_name: string;
  clan_name: string | null;
};

export async function playersRoutes(app: FastifyInstance) {
  /** GET /players/online — chars com online > 0, filtros + paginação */
  app.get("/players/online", { preHandler: authenticate }, async (req, reply) => {
    const parsed = OnlineQuery.safeParse(req.query);
    if (!parsed.success) {
      reply
        .code(400)
        .send({ error: "invalid query", details: parsed.error.flatten() });
      return;
    }
    const q = parsed.data;
    const where: string[] = ["c.online > 0"];
    const params: unknown[] = [];
    if (q.search) {
      where.push("c.char_name LIKE ?");
      params.push(`%${q.search}%`);
    }
    if (q.levelMin !== undefined) {
      where.push("c.level >= ?");
      params.push(q.levelMin);
    }
    if (q.levelMax !== undefined) {
      where.push("c.level <= ?");
      params.push(q.levelMax);
    }
    if (q.classId !== undefined) {
      where.push("c.classid = ?");
      params.push(q.classId);
    }
    const whereSql = `WHERE ${where.join(" AND ")}`;

    try {
      const [countRows] = await pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM characters c ${whereSql}`,
        params,
      );
      const total = (countRows[0]?.total as number) ?? 0;

      const [rows] = await pool.query(
        `SELECT
           c.obj_Id, c.char_name, c.level, c.classid,
           c.x, c.y, c.z, c.onlinetime, c.lastAccess,
           c.account_name, cd.clan_name
         FROM characters c
         LEFT JOIN clan_data cd ON cd.clan_id = c.clanid
         ${whereSql}
         ORDER BY c.level DESC, c.char_name ASC
         LIMIT ? OFFSET ?`,
        [...params, q.limit, q.offset],
      );
      const players = (rows as OnlineRow[]).map((r) => ({
        charId: r.obj_Id,
        name: r.char_name,
        level: r.level,
        classId: r.classid,
        className: classIdToName(r.classid),
        x: r.x,
        y: r.y,
        z: r.z,
        onlinetime: r.onlinetime,
        lastAccess: Number(r.lastAccess),
        account: r.account_name,
        clanName: r.clan_name,
      }));
      reply.send({
        players,
        total,
        limit: q.limit,
        offset: q.offset,
        timestamp: Date.now(),
      });
    } catch (e) {
      req.log.error({ err: e }, "[/players/online] failed");
      reply.code(500).send({ error: "internal error" });
    }
  });
}
