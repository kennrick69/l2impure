/**
 * Item icons — assets estáticos públicos servidos pela bridge.
 *
 * URL: GET /icons/items/<itemId>.png
 *
 * Mapeia itemId → nome do arquivo via data/icons-by-id.json (gerado
 * pelo parser-icons.cjs a partir de icons.xml do server) e serve
 * data/item-icons/<name>.png.
 *
 * SEM autenticação HMAC (assets não-sensíveis, e Cloudflare cacheia
 * agressivo via Cache-Control). SEM rate-limit pelo mesmo motivo.
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";

const ICONS_BY_ID_PATH = path.resolve("data/icons-by-id.json");
const ICONS_DIR = path.resolve("data/item-icons");

let mapCache: Record<string, string> | null = null;
let mapCacheAt = 0;
const MAP_TTL = 60 * 60 * 1000; // 1h

async function getMap(): Promise<Record<string, string>> {
  const now = Date.now();
  if (!mapCache || now - mapCacheAt > MAP_TTL) {
    const raw = await readFile(ICONS_BY_ID_PATH, "utf8");
    mapCache = JSON.parse(raw) as Record<string, string>;
    mapCacheAt = now;
  }
  return mapCache;
}

export async function iconsRoutes(app: FastifyInstance) {
  app.get<{ Params: { filename: string } }>(
    "/icons/items/:filename",
    { config: { rateLimit: false } },
    async (req, reply) => {
      const m = req.params.filename.match(/^(\d+)\.png$/);
      if (!m) {
        reply.code(400).send({ error: "filename inválido (use <id>.png)" });
        return;
      }
      const id = m[1];
      let map: Record<string, string>;
      try {
        map = await getMap();
      } catch (e) {
        req.log.error({ err: e }, "[/icons/items] map load failed");
        reply.code(500).send({ error: "icons map indisponível" });
        return;
      }
      const name = id ? map[id] : undefined;
      if (!name) {
        reply.code(404).send({ error: "sem ícone pra esse id" });
        return;
      }
      const filePath = path.resolve(ICONS_DIR, `${name}.png`);
      const rel = path.relative(ICONS_DIR, filePath);
      if (rel.startsWith("..") || path.isAbsolute(rel)) {
        reply.code(403).send({ error: "bad path" });
        return;
      }
      if (!existsSync(filePath)) {
        reply.code(404).send({ error: "PNG não disponível" });
        return;
      }
      try {
        const buf = await readFile(filePath);
        reply
          .header("Content-Type", "image/png")
          .header("Cache-Control", "public, max-age=86400, immutable")
          .send(buf);
      } catch (e) {
        req.log.error({ err: e }, "[/icons/items] read failed");
        reply.code(500).send({ error: "erro lendo arquivo" });
      }
    },
  );
}
