/**
 * NPCs admin — browse, edit name/title, spawns CRUD, dialogues r/w,
 * buylists r/w. Edições em XML/HTM exigem restart do game server
 * (HTM e NPC templates ficam cacheados em RAM).
 *
 * Backup .bak é gravado antes de cada edição destrutiva pra permitir
 * rollback manual via SSH.
 *
 * Path validation: leituras/escritas em arquivo só são aceitas se o
 * path resolvido cair dentro de HTML_ROOT (dialogues) ou NPC_DIR
 * (templates) — protege contra path traversal.
 */
import { readFile, writeFile, copyFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "../db.js";
import { authenticate } from "../auth.js";

const NPC_DIR = "/root/l2j-server/gameserver/data/xml/npcs";
const BUYLIST_PATH = "/root/l2j-server/gameserver/data/xml/buyLists.xml";
const HTML_ROOT = "/root/l2j-server/gameserver/data/html";
const DATA_DIR = path.resolve("data");

// In-memory caches
let npcsCache: string | null = null;
let npcsCacheAt = 0;
let npcFilesCache: Record<string, string> | null = null;
let buylistsByNpcCache: Record<string, number[]> | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

async function readJsonCached<T>(file: string): Promise<T> {
  const raw = await readFile(path.join(DATA_DIR, file), "utf8");
  return JSON.parse(raw) as T;
}

async function getNpcsRaw(): Promise<string> {
  const now = Date.now();
  if (!npcsCache || now - npcsCacheAt > CACHE_TTL_MS) {
    npcsCache = await readFile(path.join(DATA_DIR, "npcs.json"), "utf8");
    npcsCacheAt = now;
  }
  return npcsCache;
}

async function getNpcFilesIndex(): Promise<Record<string, string>> {
  if (!npcFilesCache) {
    npcFilesCache = await readJsonCached<Record<string, string>>(
      "npcs-files.json",
    );
  }
  return npcFilesCache;
}

async function getBuylistsByNpc(): Promise<Record<string, number[]>> {
  if (!buylistsByNpcCache) {
    buylistsByNpcCache = await readJsonCached<Record<string, number[]>>(
      "buylists-by-npc.json",
    );
  }
  return buylistsByNpcCache;
}

function clearCaches() {
  npcsCache = null;
  npcsCacheAt = 0;
  npcFilesCache = null;
  buylistsByNpcCache = null;
}

function isWithin(parent: string, target: string): boolean {
  const rel = path.relative(parent, target);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

async function backupFile(filePath: string): Promise<void> {
  if (!existsSync(filePath)) return;
  const bak = filePath + ".bak";
  await copyFile(filePath, bak);
}

// ====== Schemas ======
const SpawnInsert = z.object({
  x: z.coerce.number().int(),
  y: z.coerce.number().int(),
  z: z.coerce.number().int(),
  heading: z.coerce.number().int().default(0),
  respawnDelay: z.coerce.number().int().min(1).default(60),
  respawnRand: z.coerce.number().int().default(0),
  periodOfDay: z.coerce.number().int().min(0).max(2).default(0),
});

const SpawnKey = z.object({
  npcId: z.coerce.number().int().positive(),
  x: z.coerce.number().int(),
  y: z.coerce.number().int(),
  z: z.coerce.number().int(),
});

const SpawnUpdate = SpawnKey.extend({
  newX: z.coerce.number().int(),
  newY: z.coerce.number().int(),
  newZ: z.coerce.number().int(),
  heading: z.coerce.number().int().optional(),
  respawnDelay: z.coerce.number().int().min(1).optional(),
});

const RenameNpc = z.object({
  name: z.string().min(1).max(75),
  title: z.string().max(75).default(""),
});

const DialogueWrite = z.object({
  content: z.string().max(64 * 1024),
});

const BuyListProductAdd = z.object({
  itemId: z.coerce.number().int().positive(),
  price: z.coerce.number().int().min(0).max(2_000_000_000),
});

export async function adminNpcsRoutes(app: FastifyInstance) {
  /** GET /admin/npcs/metadata — serve npcs.json */
  app.get(
    "/admin/npcs/metadata",
    { preHandler: authenticate },
    async (req, reply) => {
      try {
        const json = await getNpcsRaw();
        reply
          .header("Content-Type", "application/json")
          .header("Cache-Control", "private, max-age=3600")
          .send(json);
      } catch (e) {
        req.log.error({ err: e }, "[/admin/npcs/metadata] failed");
        reply.code(500).send({ error: "npcs.json não disponível" });
      }
    },
  );

  /** POST /admin/npcs/cache/clear — invalida caches em RAM da bridge */
  app.post(
    "/admin/npcs/cache/clear",
    { preHandler: authenticate },
    async (_req, reply) => {
      clearCaches();
      reply.send({ ok: true });
    },
  );

  /**
   * GET /admin/npcs/all-spawns
   * Retorna { byNpc: { [npcId]: [{x,y}, ...] } } pra cliente fazer
   * lookup rápido de cidade-do-NPC sem N round-trips. Cache 5min em RAM.
   */
  let allSpawnsCache: string | null = null;
  let allSpawnsCacheAt = 0;
  const ALL_SPAWNS_TTL = 5 * 60 * 1000;

  app.get(
    "/admin/npcs/all-spawns",
    { preHandler: authenticate },
    async (req, reply) => {
      const now = Date.now();
      if (!allSpawnsCache || now - allSpawnsCacheAt > ALL_SPAWNS_TTL) {
        try {
          const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT npc_templateid, locx, locy FROM spawnlist",
          );
          const byNpc: Record<string, { x: number; y: number }[]> = {};
          for (const r of rows) {
            const id = String(r.npc_templateid);
            if (!byNpc[id]) byNpc[id] = [];
            byNpc[id]!.push({ x: r.locx as number, y: r.locy as number });
          }
          allSpawnsCache = JSON.stringify({ byNpc });
          allSpawnsCacheAt = now;
        } catch (e) {
          req.log.error({ err: e }, "[/admin/npcs/all-spawns] failed");
          reply.code(500).send({ error: "internal error" });
          return;
        }
      }
      reply
        .header("Content-Type", "application/json")
        .header("Cache-Control", "private, max-age=300")
        .send(allSpawnsCache);
    },
  );

  /** GET /admin/npcs/:id/spawns */
  app.get<{ Params: { id: string } }>(
    "/admin/npcs/:id/spawns",
    { preHandler: authenticate },
    async (req, reply) => {
      const npcId = Number(req.params.id);
      if (!Number.isFinite(npcId) || npcId <= 0) {
        reply.code(400).send({ error: "invalid npcId" });
        return;
      }
      try {
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT npc_templateid, locx, locy, locz, heading, respawn_delay, respawn_rand, periodOfDay
           FROM spawnlist WHERE npc_templateid = ?
           ORDER BY locx, locy LIMIT 500`,
          [npcId],
        );
        const spawns = rows.map((r) => ({
          npcId: r.npc_templateid as number,
          x: r.locx as number,
          y: r.locy as number,
          z: r.locz as number,
          heading: r.heading as number,
          respawnDelay: r.respawn_delay as number,
          respawnRand: r.respawn_rand as number,
          periodOfDay: r.periodOfDay as number,
        }));
        reply.send({ npcId, count: spawns.length, spawns });
      } catch (e) {
        req.log.error({ err: e }, "[/admin/npcs/:id/spawns] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /** POST /admin/npcs/:id/spawns — INSERT */
  app.post<{ Params: { id: string } }>(
    "/admin/npcs/:id/spawns",
    { preHandler: authenticate },
    async (req, reply) => {
      const npcId = Number(req.params.id);
      const parsed = SpawnInsert.safeParse(req.body);
      if (!Number.isFinite(npcId) || npcId <= 0 || !parsed.success) {
        reply.code(400).send({ error: "invalid input" });
        return;
      }
      const s = parsed.data;
      try {
        await pool.query(
          `INSERT INTO spawnlist
            (npc_templateid, locx, locy, locz, heading, respawn_delay, respawn_rand, periodOfDay)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [npcId, s.x, s.y, s.z, s.heading, s.respawnDelay, s.respawnRand, s.periodOfDay],
        );
        reply.send({ ok: true, npcId, ...s });
      } catch (e) {
        req.log.error({ err: e }, "[POST /admin/npcs/:id/spawns] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /** PATCH /admin/npcs/spawns — move spawn (composite key) */
  app.patch(
    "/admin/npcs/spawns",
    { preHandler: authenticate },
    async (req, reply) => {
      const parsed = SpawnUpdate.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "invalid input", details: parsed.error.flatten() });
        return;
      }
      const u = parsed.data;
      const sets: string[] = ["locx = ?", "locy = ?", "locz = ?"];
      const vals: unknown[] = [u.newX, u.newY, u.newZ];
      if (u.heading !== undefined) {
        sets.push("heading = ?");
        vals.push(u.heading);
      }
      if (u.respawnDelay !== undefined) {
        sets.push("respawn_delay = ?");
        vals.push(u.respawnDelay);
      }
      vals.push(u.npcId, u.x, u.y, u.z);
      try {
        const [result] = await pool.query<ResultSetHeader>(
          `UPDATE spawnlist SET ${sets.join(", ")}
           WHERE npc_templateid = ? AND locx = ? AND locy = ? AND locz = ?
           LIMIT 1`,
          vals,
        );
        if (result.affectedRows === 0) {
          reply.code(404).send({ error: "spawn not found" });
          return;
        }
        reply.send({ ok: true });
      } catch (e) {
        req.log.error({ err: e }, "[PATCH /admin/npcs/spawns] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /** DELETE /admin/npcs/spawns */
  app.delete(
    "/admin/npcs/spawns",
    { preHandler: authenticate },
    async (req, reply) => {
      const parsed = SpawnKey.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "invalid input" });
        return;
      }
      const k = parsed.data;
      try {
        const [result] = await pool.query<ResultSetHeader>(
          `DELETE FROM spawnlist
           WHERE npc_templateid = ? AND locx = ? AND locy = ? AND locz = ?
           LIMIT 1`,
          [k.npcId, k.x, k.y, k.z],
        );
        if (result.affectedRows === 0) {
          reply.code(404).send({ error: "spawn not found" });
          return;
        }
        reply.send({ ok: true });
      } catch (e) {
        req.log.error({ err: e }, "[DELETE /admin/npcs/spawns] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /** GET /admin/npcs/:id/dialogues — lista HTMs */
  app.get<{ Params: { id: string } }>(
    "/admin/npcs/:id/dialogues",
    { preHandler: authenticate },
    async (req, reply) => {
      const npcId = Number(req.params.id);
      if (!Number.isFinite(npcId) || npcId <= 0) {
        reply.code(400).send({ error: "invalid npcId" });
        return;
      }
      const result: { path: string; size: number }[] = [];
      const idStr = String(npcId);
      const reExact = new RegExp(`^${idStr}\\.htm$`);
      const rePrefix = new RegExp(`^${idStr}-[\\w-]+\\.htm$`);
      async function walk(dir: string) {
        let entries;
        try {
          entries = await readdir(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const e of entries) {
          const full = path.join(dir, e.name);
          if (e.isDirectory()) {
            await walk(full);
          } else if (e.isFile() && (reExact.test(e.name) || rePrefix.test(e.name))) {
            try {
              const st = await stat(full);
              result.push({
                path: path.relative(HTML_ROOT, full),
                size: st.size,
              });
            } catch {
              /* skip */
            }
          }
        }
      }
      await walk(HTML_ROOT);
      reply.send({ npcId, count: result.length, files: result });
    },
  );

  /** GET /admin/npcs/dialogue?path=... — lê HTM */
  app.get(
    "/admin/npcs/dialogue",
    { preHandler: authenticate },
    async (req, reply) => {
      const relPath = (req.query as Record<string, string | undefined>).path;
      if (!relPath || typeof relPath !== "string") {
        reply.code(400).send({ error: "path obrigatório" });
        return;
      }
      const full = path.resolve(HTML_ROOT, relPath);
      if (!isWithin(HTML_ROOT, full)) {
        reply.code(403).send({ error: "path inválido (escapou de html/)" });
        return;
      }
      try {
        const content = await readFile(full, "utf8");
        const st = await stat(full);
        reply.send({ path: relPath, content, size: st.size, mtime: st.mtimeMs });
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        if (err.code === "ENOENT") {
          reply.code(404).send({ error: "file not found" });
          return;
        }
        req.log.error({ err: e }, "[GET dialogue] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /** PUT /admin/npcs/dialogue?path=... — escreve HTM (com backup) */
  app.put(
    "/admin/npcs/dialogue",
    { preHandler: authenticate },
    async (req, reply) => {
      const relPath = (req.query as Record<string, string | undefined>).path;
      const parsed = DialogueWrite.safeParse(req.body);
      if (!relPath || !parsed.success) {
        reply.code(400).send({ error: "invalid input" });
        return;
      }
      const full = path.resolve(HTML_ROOT, relPath);
      if (!isWithin(HTML_ROOT, full)) {
        reply.code(403).send({ error: "path inválido" });
        return;
      }
      if (!existsSync(full)) {
        reply.code(404).send({ error: "file not found (criar novo arquivo manualmente via SSH primeiro)" });
        return;
      }
      try {
        await backupFile(full);
        await writeFile(full, parsed.data.content, "utf8");
        reply.send({ ok: true, path: relPath, restartRequired: true });
      } catch (e) {
        req.log.error({ err: e }, "[PUT dialogue] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /** GET /admin/npcs/:id/buylists — retorna products de cada buylist do NPC */
  app.get<{ Params: { id: string } }>(
    "/admin/npcs/:id/buylists",
    { preHandler: authenticate },
    async (req, reply) => {
      const npcId = Number(req.params.id);
      if (!Number.isFinite(npcId) || npcId <= 0) {
        reply.code(400).send({ error: "invalid npcId" });
        return;
      }
      try {
        const idx = await getBuylistsByNpc();
        const ids = idx[String(npcId)] ?? [];
        if (ids.length === 0) {
          reply.send({ npcId, buylists: [] });
          return;
        }
        const xml = await readFile(BUYLIST_PATH, "utf8");
        const buylists = ids.map((bId) => {
          const blockRe = new RegExp(
            `<buyList\\s+id="${bId}"\\s+npcId="${npcId}"\\s*>([\\s\\S]*?)<\\/buyList>`,
          );
          const m = blockRe.exec(xml);
          const products: { itemId: number; price: number }[] = [];
          if (m) {
            const productRe = /<product\s+id="(\d+)"\s+price="(\d+)"\s*\/?>/g;
            let pm;
            while ((pm = productRe.exec(m[1] || "")) !== null) {
              products.push({
                itemId: Number(pm[1]),
                price: Number(pm[2]),
              });
            }
          }
          return { buyListId: bId, products };
        });
        reply.send({ npcId, buylists });
      } catch (e) {
        req.log.error({ err: e }, "[GET buylists] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /** POST /admin/npcs/buylists/:buyListId/products — adiciona product (com backup) */
  app.post<{ Params: { buyListId: string } }>(
    "/admin/npcs/buylists/:buyListId/products",
    { preHandler: authenticate },
    async (req, reply) => {
      const buyListId = Number(req.params.buyListId);
      const parsed = BuyListProductAdd.safeParse(req.body);
      if (!Number.isFinite(buyListId) || buyListId <= 0 || !parsed.success) {
        reply.code(400).send({ error: "invalid input" });
        return;
      }
      const { itemId, price } = parsed.data;
      try {
        let xml = await readFile(BUYLIST_PATH, "utf8");
        const blockRe = new RegExp(
          `(<buyList\\s+id="${buyListId}"\\s+npcId="\\d+"\\s*>)([\\s\\S]*?)(<\\/buyList>)`,
        );
        const m = blockRe.exec(xml);
        if (!m) {
          reply.code(404).send({ error: "buyList not found" });
          return;
        }
        const open = m[1] ?? "";
        const inner = m[2] ?? "";
        const close = m[3] ?? "";
        const newProduct = `\n\t\t<product id="${itemId}" price="${price}"/>`;
        const replaced = open + inner + newProduct + "\n\t" + close;
        await backupFile(BUYLIST_PATH);
        xml = xml.replace(blockRe, replaced);
        await writeFile(BUYLIST_PATH, xml, "utf8");
        reply.send({ ok: true, restartRequired: true });
      } catch (e) {
        req.log.error({ err: e }, "[POST buylist product] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /** PATCH /admin/npcs/buylists/:buyListId/products/:itemId — muda price */
  app.patch<{ Params: { buyListId: string; itemId: string } }>(
    "/admin/npcs/buylists/:buyListId/products/:itemId",
    { preHandler: authenticate },
    async (req, reply) => {
      const buyListId = Number(req.params.buyListId);
      const itemId = Number(req.params.itemId);
      const body = (req.body ?? {}) as { price?: number };
      const price = Number(body.price);
      if (
        !Number.isFinite(buyListId) ||
        buyListId <= 0 ||
        !Number.isFinite(itemId) ||
        itemId <= 0 ||
        !Number.isFinite(price) ||
        price < 0 ||
        price > 2_000_000_000
      ) {
        reply.code(400).send({ error: "params inválidos" });
        return;
      }
      try {
        let xml = await readFile(BUYLIST_PATH, "utf8");
        const blockRe = new RegExp(
          `(<buyList\\s+id="${buyListId}"\\s+npcId="\\d+"\\s*>)([\\s\\S]*?)(<\\/buyList>)`,
        );
        const m = blockRe.exec(xml);
        if (!m) {
          reply.code(404).send({ error: "buyList not found" });
          return;
        }
        const open = m[1] ?? "";
        const inner = m[2] ?? "";
        const close = m[3] ?? "";
        const productRe = new RegExp(
          `(<product\\s+id="${itemId}"\\s+price=")\\d+("\\s*\\/?>)`,
        );
        if (!productRe.test(inner)) {
          reply.code(404).send({ error: "product not in buyList" });
          return;
        }
        const newInner = inner.replace(productRe, `$1${price}$2`);
        await backupFile(BUYLIST_PATH);
        xml = xml.replace(blockRe, open + newInner + close);
        await writeFile(BUYLIST_PATH, xml, "utf8");
        reply.send({ ok: true, restartRequired: true });
      } catch (e) {
        req.log.error({ err: e }, "[PATCH buylist product price] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /** DELETE /admin/npcs/buylists/:buyListId/products/:itemId */
  app.delete<{ Params: { buyListId: string; itemId: string } }>(
    "/admin/npcs/buylists/:buyListId/products/:itemId",
    { preHandler: authenticate },
    async (req, reply) => {
      const buyListId = Number(req.params.buyListId);
      const itemId = Number(req.params.itemId);
      if (
        !Number.isFinite(buyListId) ||
        buyListId <= 0 ||
        !Number.isFinite(itemId) ||
        itemId <= 0
      ) {
        reply.code(400).send({ error: "invalid params" });
        return;
      }
      try {
        let xml = await readFile(BUYLIST_PATH, "utf8");
        const blockRe = new RegExp(
          `(<buyList\\s+id="${buyListId}"\\s+npcId="\\d+"\\s*>)([\\s\\S]*?)(<\\/buyList>)`,
        );
        const m = blockRe.exec(xml);
        if (!m) {
          reply.code(404).send({ error: "buyList not found" });
          return;
        }
        const productRe = new RegExp(
          `\\s*<product\\s+id="${itemId}"\\s+price="\\d+"\\s*\\/?>\\s*`,
        );
        const open = m[1] ?? "";
        const inner = m[2] ?? "";
        const close = m[3] ?? "";
        if (!productRe.test(inner)) {
          reply.code(404).send({ error: "product not in buyList" });
          return;
        }
        const newInner = inner.replace(productRe, "\n\t\t");
        await backupFile(BUYLIST_PATH);
        xml = xml.replace(blockRe, open + newInner + close);
        await writeFile(BUYLIST_PATH, xml, "utf8");
        reply.send({ ok: true, restartRequired: true });
      } catch (e) {
        req.log.error({ err: e }, "[DELETE buylist product] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /** PATCH /admin/npcs/:id — rename name/title (XML edit + backup) */
  app.patch<{ Params: { id: string } }>(
    "/admin/npcs/:id",
    { preHandler: authenticate },
    async (req, reply) => {
      const npcId = Number(req.params.id);
      const parsed = RenameNpc.safeParse(req.body);
      if (!Number.isFinite(npcId) || npcId <= 0 || !parsed.success) {
        reply.code(400).send({ error: "invalid input" });
        return;
      }
      const { name, title } = parsed.data;
      try {
        const idx = await getNpcFilesIndex();
        const relFile = idx[String(npcId)];
        if (!relFile) {
          reply.code(404).send({ error: "NPC não encontrado no índice" });
          return;
        }
        const fullPath = path.resolve(NPC_DIR, relFile);
        if (!isWithin(NPC_DIR, fullPath)) {
          reply.code(500).send({ error: "path index corrompido" });
          return;
        }
        let xml = await readFile(fullPath, "utf8");
        const tagRe = new RegExp(
          `<npc\\s+id="${npcId}"(\\s+name="[^"]*")?(\\s+title="[^"]*")?(\\s*>)`,
        );
        if (!tagRe.test(xml)) {
          reply.code(404).send({ error: "tag <npc id=...> não localizada" });
          return;
        }
        const safeName = name.replace(/"/g, "&quot;");
        const safeTitle = title.replace(/"/g, "&quot;");
        const newTag = `<npc id="${npcId}" name="${safeName}" title="${safeTitle}">`;
        await backupFile(fullPath);
        xml = xml.replace(tagRe, newTag);
        await writeFile(fullPath, xml, "utf8");
        // Limpa cache pra próxima leitura pegar o novo
        clearCaches();
        reply.send({ ok: true, file: relFile, restartRequired: true });
      } catch (e) {
        req.log.error({ err: e }, "[PATCH npc rename] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );
}
