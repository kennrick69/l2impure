/**
 * Items metadata (dump XML) e busca de owners.
 *
 * - GET /admin/items/metadata: serve items.json gerado dos XMLs do
 *   game server. Cliente faz cache.
 * - GET /admin/items/owners?itemId=X: lista quem tem aquele item.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "../db.js";
import { authenticate } from "../auth.js";

const ITEMS_JSON_PATH = resolve("data/items.json");

let itemsCache: string | null = null;
let itemsCacheLoadedAt = 0;
const ITEMS_CACHE_TTL_MS = 60 * 60 * 1000; // 1h

async function getItemsJson(): Promise<string> {
  const now = Date.now();
  if (!itemsCache || now - itemsCacheLoadedAt > ITEMS_CACHE_TTL_MS) {
    itemsCache = await readFile(ITEMS_JSON_PATH, "utf8");
    itemsCacheLoadedAt = now;
  }
  return itemsCache;
}

const OwnersQuery = z.object({
  itemId: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function adminItemsRoutes(app: FastifyInstance) {
  /** GET /admin/items/metadata — items.json bruto */
  app.get(
    "/admin/items/metadata",
    { preHandler: authenticate },
    async (req, reply) => {
      try {
        const json = await getItemsJson();
        reply
          .header("Content-Type", "application/json")
          .header("Cache-Control", "private, max-age=3600")
          .send(json);
      } catch (e) {
        req.log.error({ err: e }, "[/admin/items/metadata] failed");
        reply.code(500).send({ error: "items.json não disponível" });
      }
    },
  );

  /** GET /admin/items/owners?itemId=X */
  app.get(
    "/admin/items/owners",
    { preHandler: authenticate },
    async (req, reply) => {
      const parsed = OwnersQuery.safeParse(req.query);
      if (!parsed.success) {
        reply.code(400).send({ error: "invalid query" });
        return;
      }
      const { itemId, limit, offset } = parsed.data;
      try {
        const [countRows] = await pool.query<RowDataPacket[]>(
          "SELECT COUNT(*) AS total FROM items WHERE item_id = ?",
          [itemId],
        );
        const total = (countRows[0]?.total as number) ?? 0;

        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT
             i.object_id, i.owner_id, i.count, i.enchant_level, i.loc,
             c.char_name, c.account_name, c.online, c.level, c.classid
           FROM items i
           JOIN characters c ON c.obj_Id = i.owner_id
           WHERE i.item_id = ?
           ORDER BY i.enchant_level DESC, i.count DESC
           LIMIT ? OFFSET ?`,
          [itemId, limit, offset],
        );
        const owners = rows.map((r) => ({
          objectId: r.object_id as number,
          charId: r.owner_id as number,
          charName: r.char_name as string,
          account: r.account_name as string,
          online: (r.online as number) > 0,
          level: r.level as number,
          classId: r.classid as number,
          count: Number(r.count),
          enchantLevel: r.enchant_level as number,
          loc: r.loc as string,
        }));
        reply.send({ owners, total, itemId, limit, offset });
      } catch (e) {
        req.log.error({ err: e }, "[/admin/items/owners] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );
}
