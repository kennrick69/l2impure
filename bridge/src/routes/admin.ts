/**
 * Rotas administrativas (GM tools). Todas autenticadas via HMAC; a
 * proteção de role admin é feita no lado Next antes de chamar a bridge.
 *
 * Mutações em characters exigem `online = 0` — se char está jogando,
 * retorna 409 "character online" (UI mostra mensagem amigável).
 */
import type { FastifyInstance } from "fastify";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "../db.js";
import { authenticate } from "../auth.js";
import { classIdToName, expForLevel } from "../l2j.js";

const ADENA_ITEM_ID = 57;

type CharRow = {
  obj_Id: number;
  char_name: string;
  classid: number;
  level: number;
  online: number;
  account_name: string;
  clanid: number;
  clan_name: string | null;
};

async function disambiguateOfflineUpdate(
  affectedRows: number,
  whereField: "char_name" | "obj_Id",
  whereValue: string | number,
): Promise<{ ok: true } | { ok: false; status: 404 | 409; error: string }> {
  if (affectedRows === 1) return { ok: true };
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT online FROM characters WHERE ${whereField} = ? LIMIT 1`,
    [whereValue],
  );
  if (rows.length === 0) return { ok: false, status: 404, error: "character not found" };
  return { ok: false, status: 409, error: "character online" };
}

const SearchQuery = z.object({
  name: z.string().min(1).max(45),
});

const SetLevelBody = z.object({
  charName: z.string().min(1).max(35),
  level: z.coerce.number().int().min(1).max(85),
});

const SetClassBody = z.object({
  charName: z.string().min(1).max(35),
  classId: z.coerce.number().int().min(0).max(200),
});

const AddItemBody = z.object({
  charName: z.string().min(1).max(35),
  itemId: z.coerce.number().int().positive(),
  count: z.coerce.number().int().positive().max(2_000_000_000),
});

const SetNameBody = z.object({
  charId: z.coerce.number().int().positive(),
  newName: z
    .string()
    .min(1)
    .max(35)
    .regex(/^[A-Za-z0-9_-]+$/, "alfanumérico"),
});

const AddAdenaBody = z.object({
  charName: z.string().min(1).max(35),
  amount: z.coerce.number().int().positive().max(2_000_000_000),
});

const SetAccessLevelBody = z.object({
  login: z
    .string()
    .min(1)
    .max(45)
    .regex(/^[A-Za-z0-9]+$/),
  level: z.coerce.number().int().min(-100).max(127),
});

const TeleportBody = z.object({
  charName: z.string().min(1).max(35),
  x: z.coerce.number().int(),
  y: z.coerce.number().int(),
  z: z.coerce.number().int(),
});

export async function adminRoutes(app: FastifyInstance) {
  /**
   * GET /admin/characters/search?name=xxx
   */
  app.get(
    "/admin/characters/search",
    { preHandler: authenticate },
    async (req, reply) => {
      const parsed = SearchQuery.safeParse(req.query);
      if (!parsed.success) {
        reply.code(400).send({ error: "invalid query" });
        return;
      }
      const term = `%${parsed.data.name}%`;
      try {
        const [rows] = await pool.query(
          `SELECT
             c.obj_Id, c.char_name, c.classid, c.level, c.online,
             c.account_name, c.clanid, cd.clan_name
           FROM characters c
           LEFT JOIN clan_data cd ON cd.clan_id = c.clanid
           WHERE c.char_name LIKE ?
           ORDER BY c.online DESC, c.level DESC, c.char_name ASC
           LIMIT 25`,
          [term],
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
        }));
        reply.send({ characters, count: characters.length });
      } catch (e) {
        req.log.error({ err: e }, "[/admin/characters/search] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /**
   * POST /admin/characters/set-level {charName, level}
   */
  app.post(
    "/admin/characters/set-level",
    { preHandler: authenticate },
    async (req, reply) => {
      const parsed = SetLevelBody.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "invalid body", details: parsed.error.flatten() });
        return;
      }
      const { charName, level } = parsed.data;
      const exp = expForLevel(level);
      try {
        const [result] = await pool.query<ResultSetHeader>(
          "UPDATE characters SET level = ?, exp = ? WHERE char_name = ? AND online = 0",
          [level, exp, charName],
        );
        const dis = await disambiguateOfflineUpdate(result.affectedRows, "char_name", charName);
        if (!dis.ok) {
          reply.code(dis.status).send({ error: dis.error });
          return;
        }
        reply.send({ ok: true, charName, level, exp });
      } catch (e) {
        req.log.error({ err: e }, "[/admin/characters/set-level] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /**
   * POST /admin/characters/set-class {charName, classId}
   */
  app.post(
    "/admin/characters/set-class",
    { preHandler: authenticate },
    async (req, reply) => {
      const parsed = SetClassBody.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "invalid body", details: parsed.error.flatten() });
        return;
      }
      const { charName, classId } = parsed.data;
      try {
        const [result] = await pool.query<ResultSetHeader>(
          "UPDATE characters SET classid = ? WHERE char_name = ? AND online = 0",
          [classId, charName],
        );
        const dis = await disambiguateOfflineUpdate(result.affectedRows, "char_name", charName);
        if (!dis.ok) {
          reply.code(dis.status).send({ error: dis.error });
          return;
        }
        reply.send({ ok: true, charName, classId, className: classIdToName(classId) });
      } catch (e) {
        req.log.error({ err: e }, "[/admin/characters/set-class] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /**
   * POST /admin/characters/add-item {charName, itemId, count}
   */
  app.post(
    "/admin/characters/add-item",
    { preHandler: authenticate },
    async (req, reply) => {
      const parsed = AddItemBody.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "invalid body", details: parsed.error.flatten() });
        return;
      }
      const { charName, itemId, count } = parsed.data;
      try {
        const [charRows] = await pool.query<RowDataPacket[]>(
          "SELECT obj_Id, online FROM characters WHERE char_name = ? LIMIT 1",
          [charName],
        );
        const charRow = charRows[0];
        if (!charRow) {
          reply.code(404).send({ error: "character not found" });
          return;
        }
        if ((charRow.online as number) > 0) {
          reply.code(409).send({ error: "character online" });
          return;
        }
        const ownerId = charRow.obj_Id as number;
        const [maxRows] = await pool.query<RowDataPacket[]>(
          "SELECT COALESCE(MAX(object_id), 268435456) AS max_id FROM items",
        );
        const maxRow = maxRows[0];
        const objectId = ((maxRow?.max_id as number | undefined) ?? 268435456) + 1;
        await pool.query(
          `INSERT INTO items
             (owner_id, object_id, item_id, count, enchant_level, loc, loc_data, custom_type1, custom_type2, mana_left, time)
           VALUES (?, ?, ?, ?, 0, 'INVENTORY', 0, 0, 0, -1, 0)`,
          [ownerId, objectId, itemId, count],
        );
        reply.send({ ok: true, charName, itemId, count, objectId });
      } catch (e) {
        req.log.error({ err: e }, "[/admin/characters/add-item] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /**
   * POST /admin/characters/set-name {charId, newName}
   */
  app.post(
    "/admin/characters/set-name",
    { preHandler: authenticate },
    async (req, reply) => {
      const parsed = SetNameBody.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "invalid body", details: parsed.error.flatten() });
        return;
      }
      const { charId, newName } = parsed.data;
      try {
        const [exists] = await pool.query<RowDataPacket[]>(
          "SELECT obj_Id FROM characters WHERE char_name = ? LIMIT 1",
          [newName],
        );
        if (exists.length > 0) {
          reply.code(409).send({ error: "name taken" });
          return;
        }
        const [result] = await pool.query<ResultSetHeader>(
          "UPDATE characters SET char_name = ? WHERE obj_Id = ? AND online = 0",
          [newName, charId],
        );
        const dis = await disambiguateOfflineUpdate(result.affectedRows, "obj_Id", charId);
        if (!dis.ok) {
          reply.code(dis.status).send({ error: dis.error });
          return;
        }
        reply.send({ ok: true, charId, newName });
      } catch (e) {
        req.log.error({ err: e }, "[/admin/characters/set-name] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /**
   * POST /admin/characters/add-adena {charName, amount}
   * Faz UPDATE no item_id=57 do owner; se não existir, INSERT.
   */
  app.post(
    "/admin/characters/add-adena",
    { preHandler: authenticate },
    async (req, reply) => {
      const parsed = AddAdenaBody.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "invalid body", details: parsed.error.flatten() });
        return;
      }
      const { charName, amount } = parsed.data;
      try {
        const [charRows] = await pool.query<RowDataPacket[]>(
          "SELECT obj_Id, online FROM characters WHERE char_name = ? LIMIT 1",
          [charName],
        );
        const charRow = charRows[0];
        if (!charRow) {
          reply.code(404).send({ error: "character not found" });
          return;
        }
        if ((charRow.online as number) > 0) {
          reply.code(409).send({ error: "character online" });
          return;
        }
        const ownerId = charRow.obj_Id as number;
        const [updateResult] = await pool.query<ResultSetHeader>(
          "UPDATE items SET count = count + ? WHERE owner_id = ? AND item_id = ?",
          [amount, ownerId, ADENA_ITEM_ID],
        );
        if (updateResult.affectedRows === 0) {
          const [maxRows] = await pool.query<RowDataPacket[]>(
            "SELECT COALESCE(MAX(object_id), 268435456) AS max_id FROM items",
          );
          const maxRow = maxRows[0];
          const objectId = ((maxRow?.max_id as number | undefined) ?? 268435456) + 1;
          await pool.query(
            `INSERT INTO items
               (owner_id, object_id, item_id, count, enchant_level, loc, loc_data, custom_type1, custom_type2, mana_left, time)
             VALUES (?, ?, ?, ?, 0, 'INVENTORY', 0, 0, 0, -1, 0)`,
            [ownerId, objectId, ADENA_ITEM_ID, amount],
          );
        }
        reply.send({ ok: true, charName, amount });
      } catch (e) {
        req.log.error({ err: e }, "[/admin/characters/add-adena] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /**
   * POST /admin/accounts/set-access-level {login, level}
   */
  app.post(
    "/admin/accounts/set-access-level",
    { preHandler: authenticate },
    async (req, reply) => {
      const parsed = SetAccessLevelBody.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "invalid body", details: parsed.error.flatten() });
        return;
      }
      const { login, level } = parsed.data;
      try {
        const [result] = await pool.query<ResultSetHeader>(
          "UPDATE accounts SET access_level = ? WHERE login = ?",
          [level, login],
        );
        if (result.affectedRows === 0) {
          reply.code(404).send({ error: "account not found" });
          return;
        }
        reply.send({ ok: true, login, level });
      } catch (e) {
        req.log.error({ err: e }, "[/admin/accounts/set-access-level] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /**
   * POST /admin/characters/teleport {charName, x, y, z}
   */
  app.post(
    "/admin/characters/teleport",
    { preHandler: authenticate },
    async (req, reply) => {
      const parsed = TeleportBody.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "invalid body", details: parsed.error.flatten() });
        return;
      }
      const { charName, x, y, z } = parsed.data;
      try {
        const [result] = await pool.query<ResultSetHeader>(
          "UPDATE characters SET x = ?, y = ?, z = ? WHERE char_name = ? AND online = 0",
          [x, y, z, charName],
        );
        const dis = await disambiguateOfflineUpdate(result.affectedRows, "char_name", charName);
        if (!dis.ok) {
          reply.code(dis.status).send({ error: dis.error });
          return;
        }
        reply.send({ ok: true, charName, x, y, z });
      } catch (e) {
        req.log.error({ err: e }, "[/admin/characters/teleport] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );
}
