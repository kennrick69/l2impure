/**
 * Listagem e detalhes de personagens (admin). Inclui inventário e
 * ações granulares de mod de item (add/remove/modify) por charId.
 *
 * Mutações exigem que o char esteja offline. Se logado, retorna 409.
 */
import type { FastifyInstance } from "fastify";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "../db.js";
import { authenticate } from "../auth.js";
import { classIdToName } from "../l2j.js";

type CharRow = {
  obj_Id: number;
  char_name: string;
  classid: number;
  level: number;
  online: number;
  account_name: string;
  clanid: number;
  clan_name: string | null;
  pvpkills: number;
  pkkills: number;
};

const ListQuery = z.object({
  name: z.string().max(45).optional(),
  levelMin: z.coerce.number().int().min(0).max(127).optional(),
  levelMax: z.coerce.number().int().min(0).max(127).optional(),
  classId: z.coerce.number().int().min(0).max(200).optional(),
  online: z
    .enum(["true", "false"])
    .transform((s) => s === "true")
    .optional(),
  hasClan: z
    .enum(["true", "false"])
    .transform((s) => s === "true")
    .optional(),
  account: z.string().max(45).optional(),
  sort: z
    .enum([
      "level",
      "char_name",
      "pvpkills",
      "pkkills",
      "online",
    ])
    .default("level"),
  dir: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const AddItemBody = z.object({
  itemId: z.coerce.number().int().positive(),
  count: z.coerce.number().int().positive().max(2_000_000_000),
  enchantLevel: z.coerce.number().int().min(0).max(40).default(0),
});

const ModifyItemBody = z.object({
  objectId: z.coerce.number().int().positive(),
  count: z.coerce.number().int().min(0).max(2_000_000_000).optional(),
  enchantLevel: z.coerce.number().int().min(0).max(40).optional(),
});

const RemoveItemBody = z.object({
  objectId: z.coerce.number().int().positive(),
});

async function checkCharOffline(charId: number): Promise<
  | { ok: true; obj_Id: number }
  | { ok: false; status: 404 | 409; error: string }
> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT obj_Id, online FROM characters WHERE obj_Id = ? LIMIT 1",
    [charId],
  );
  const row = rows[0];
  if (!row) return { ok: false, status: 404, error: "character not found" };
  if ((row.online as number) > 0)
    return { ok: false, status: 409, error: "character online" };
  return { ok: true, obj_Id: row.obj_Id as number };
}

export async function adminCharactersRoutes(app: FastifyInstance) {
  /** GET /admin/characters/list — listagem paginada + filtros */
  app.get(
    "/admin/characters/list",
    { preHandler: authenticate },
    async (req, reply) => {
      const parsed = ListQuery.safeParse(req.query);
      if (!parsed.success) {
        reply.code(400).send({ error: "invalid query", details: parsed.error.flatten() });
        return;
      }
      const q = parsed.data;
      const where: string[] = [];
      const params: unknown[] = [];
      if (q.name) {
        where.push("c.char_name LIKE ?");
        params.push(`%${q.name}%`);
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
      if (q.online !== undefined) {
        where.push(q.online ? "c.online > 0" : "c.online = 0");
      }
      if (q.hasClan !== undefined) {
        where.push(q.hasClan ? "c.clanid > 0" : "(c.clanid IS NULL OR c.clanid = 0)");
      }
      if (q.account) {
        where.push("c.account_name = ?");
        params.push(q.account);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      // sort: já validado pelo zod
      const sortMap: Record<string, string> = {
        level: "c.level",
        char_name: "c.char_name",
        pvpkills: "c.pvpkills",
        pkkills: "c.pkkills",
        online: "c.online",
      };
      const orderSql = `ORDER BY ${sortMap[q.sort]} ${q.dir.toUpperCase()}, c.char_name ASC`;

      try {
        const [countRows] = await pool.query<RowDataPacket[]>(
          `SELECT COUNT(*) AS total FROM characters c ${whereSql}`,
          params,
        );
        const total = (countRows[0]?.total as number) ?? 0;

        const [rows] = await pool.query(
          `SELECT
             c.obj_Id, c.char_name, c.classid, c.level, c.online,
             c.account_name, c.clanid, c.pvpkills, c.pkkills,
             cd.clan_name
           FROM characters c
           LEFT JOIN clan_data cd ON cd.clan_id = c.clanid
           ${whereSql}
           ${orderSql}
           LIMIT ? OFFSET ?`,
          [...params, q.limit, q.offset],
        );
        const characters = (rows as CharRow[]).map((r) => ({
          charId: r.obj_Id,
          name: r.char_name,
          classId: r.classid,
          className: classIdToName(r.classid),
          level: r.level,
          online: r.online > 0,
          account: r.account_name,
          clanId: r.clanid || null,
          clanName: r.clan_name,
          pvp: r.pvpkills,
          pk: r.pkkills,
        }));
        reply.send({ characters, total, limit: q.limit, offset: q.offset });
      } catch (e) {
        req.log.error({ err: e }, "[/admin/characters/list] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /** GET /admin/characters/:charId/full — char + inventário */
  app.get<{ Params: { charId: string } }>(
    "/admin/characters/:charId/full",
    { preHandler: authenticate },
    async (req, reply) => {
      const charId = Number(req.params.charId);
      if (!Number.isFinite(charId) || charId <= 0) {
        reply.code(400).send({ error: "invalid charId" });
        return;
      }
      try {
        const [charRows] = await pool.query<RowDataPacket[]>(
          `SELECT
             c.obj_Id, c.char_name, c.classid, c.level, c.online,
             c.account_name, c.clanid, c.pvpkills, c.pkkills,
             c.exp, c.sp, c.karma, c.x, c.y, c.z,
             c.maxHp, c.maxMp, c.maxCp, c.race, c.sex,
             c.lastAccess, c.onlinetime, c.nobless, c.hero,
             cd.clan_name
           FROM characters c
           LEFT JOIN clan_data cd ON cd.clan_id = c.clanid
           WHERE c.obj_Id = ?
           LIMIT 1`,
          [charId],
        );
        const c = charRows[0];
        if (!c) {
          reply.code(404).send({ error: "character not found" });
          return;
        }
        const [items] = await pool.query<RowDataPacket[]>(
          `SELECT object_id, item_id, count, enchant_level, loc, loc_data
           FROM items
           WHERE owner_id = ? AND loc IN ('INVENTORY', 'PAPERDOLL', 'WAREHOUSE', 'FREIGHT')
           ORDER BY loc, item_id`,
          [charId],
        );
        const inventory = items.map((i) => ({
          objectId: i.object_id as number,
          itemId: i.item_id as number,
          count: Number(i.count),
          enchantLevel: i.enchant_level as number,
          loc: i.loc as string,
          locData: i.loc_data as number,
        }));
        reply.send({
          char: {
            charId: c.obj_Id as number,
            name: c.char_name as string,
            classId: c.classid as number,
            className: classIdToName(c.classid as number),
            level: c.level as number,
            online: (c.online as number) > 0,
            account: c.account_name as string,
            clanId: (c.clanid as number) || null,
            clanName: c.clan_name as string | null,
            pvp: c.pvpkills as number,
            pk: c.pkkills as number,
            exp: Number(c.exp),
            sp: c.sp as number,
            karma: c.karma as number,
            x: c.x as number,
            y: c.y as number,
            z: c.z as number,
            maxHp: c.maxHp as number,
            maxMp: c.maxMp as number,
            maxCp: c.maxCp as number,
            race: c.race as number,
            sex: c.sex as number,
            lastAccess: Number(c.lastAccess),
            onlinetime: c.onlinetime as number,
            nobless: (c.nobless as number) > 0,
            hero: (c.hero as number) > 0,
          },
          inventory,
        });
      } catch (e) {
        req.log.error({ err: e }, "[/admin/characters/:charId/full] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /** POST /admin/characters/:charId/items/add */
  app.post<{ Params: { charId: string } }>(
    "/admin/characters/:charId/items/add",
    { preHandler: authenticate },
    async (req, reply) => {
      const charId = Number(req.params.charId);
      const parsed = AddItemBody.safeParse(req.body);
      if (!Number.isFinite(charId) || charId <= 0 || !parsed.success) {
        reply.code(400).send({ error: "invalid input" });
        return;
      }
      const { itemId, count, enchantLevel } = parsed.data;
      const check = await checkCharOffline(charId);
      if (!check.ok) {
        reply.code(check.status).send({ error: check.error });
        return;
      }
      try {
        const [maxRows] = await pool.query<RowDataPacket[]>(
          "SELECT COALESCE(MAX(object_id), 268435456) AS max_id FROM items",
        );
        const maxRow = maxRows[0];
        const objectId =
          ((maxRow?.max_id as number | undefined) ?? 268435456) + 1;
        await pool.query(
          `INSERT INTO items
             (owner_id, object_id, item_id, count, enchant_level, loc, loc_data, custom_type1, custom_type2, mana_left, time)
           VALUES (?, ?, ?, ?, ?, 'INVENTORY', 0, 0, 0, -1, 0)`,
          [check.obj_Id, objectId, itemId, count, enchantLevel],
        );
        reply.send({ ok: true, objectId, itemId, count, enchantLevel });
      } catch (e) {
        req.log.error({ err: e }, "[/admin/characters/:charId/items/add] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /** POST /admin/characters/:charId/items/modify */
  app.post<{ Params: { charId: string } }>(
    "/admin/characters/:charId/items/modify",
    { preHandler: authenticate },
    async (req, reply) => {
      const charId = Number(req.params.charId);
      const parsed = ModifyItemBody.safeParse(req.body);
      if (!Number.isFinite(charId) || charId <= 0 || !parsed.success) {
        reply.code(400).send({ error: "invalid input" });
        return;
      }
      const { objectId, count, enchantLevel } = parsed.data;
      if (count === undefined && enchantLevel === undefined) {
        reply.code(400).send({ error: "nada pra modificar" });
        return;
      }
      const check = await checkCharOffline(charId);
      if (!check.ok) {
        reply.code(check.status).send({ error: check.error });
        return;
      }
      const sets: string[] = [];
      const params: unknown[] = [];
      if (count !== undefined) {
        sets.push("count = ?");
        params.push(count);
      }
      if (enchantLevel !== undefined) {
        sets.push("enchant_level = ?");
        params.push(enchantLevel);
      }
      params.push(objectId, check.obj_Id);
      try {
        const [result] = await pool.query<ResultSetHeader>(
          `UPDATE items SET ${sets.join(", ")} WHERE object_id = ? AND owner_id = ?`,
          params,
        );
        if (result.affectedRows === 0) {
          reply.code(404).send({ error: "item not found in inventory" });
          return;
        }
        reply.send({ ok: true, objectId, count, enchantLevel });
      } catch (e) {
        req.log.error({ err: e }, "[/admin/characters/:charId/items/modify] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /** POST /admin/characters/:charId/items/remove */
  app.post<{ Params: { charId: string } }>(
    "/admin/characters/:charId/items/remove",
    { preHandler: authenticate },
    async (req, reply) => {
      const charId = Number(req.params.charId);
      const parsed = RemoveItemBody.safeParse(req.body);
      if (!Number.isFinite(charId) || charId <= 0 || !parsed.success) {
        reply.code(400).send({ error: "invalid input" });
        return;
      }
      const check = await checkCharOffline(charId);
      if (!check.ok) {
        reply.code(check.status).send({ error: check.error });
        return;
      }
      try {
        const [result] = await pool.query<ResultSetHeader>(
          "DELETE FROM items WHERE object_id = ? AND owner_id = ?",
          [parsed.data.objectId, check.obj_Id],
        );
        if (result.affectedRows === 0) {
          reply.code(404).send({ error: "item not found in inventory" });
          return;
        }
        reply.send({ ok: true });
      } catch (e) {
        req.log.error({ err: e }, "[/admin/characters/:charId/items/remove] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );
}
