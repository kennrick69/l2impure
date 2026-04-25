/**
 * Rankings — top PvP, top PK, top clãs.
 *
 * Todas as rotas são autenticadas e retornam array já ordenado com
 * campo `rank` calculado em cima do índice. Limit 100 personagens
 * (PvP/PK) e 50 clãs.
 */
import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";
import { authenticate } from "../auth.js";
import { classIdToName } from "../l2j.js";

type CharRankRow = {
  char_name: string;
  classid: number;
  level: number;
  value: number;
  clan_name: string | null;
};

type ClanRankRow = {
  clan_name: string;
  clan_level: number;
  reputation_score: number;
  members: number | string; // mysql2 às vezes devolve subquery COUNT como string
  leader_name: string | null;
};

async function topChars(
  pool_: typeof pool,
  killsColumn: "pvpkills" | "pkkills",
) {
  const [rows] = await pool_.query(
    `SELECT
       c.char_name,
       c.classid,
       c.level,
       c.${killsColumn} AS value,
       cd.clan_name
     FROM characters c
     LEFT JOIN clan_data cd ON cd.clan_id = c.clanid
     WHERE c.${killsColumn} > 0
     ORDER BY c.${killsColumn} DESC, c.char_name ASC
     LIMIT 100`,
  );
  return (rows as CharRankRow[]).map((r, i) => ({
    rank: i + 1,
    name: r.char_name,
    className: classIdToName(r.classid),
    level: r.level,
    clan: r.clan_name,
    value: r.value,
  }));
}

export async function rankingRoutes(app: FastifyInstance) {
  app.get(
    "/rankings/pvp",
    { preHandler: authenticate },
    async (req, reply) => {
      try {
        reply.send(await topChars(pool, "pvpkills"));
      } catch (e) {
        req.log.error({ err: e }, "[/rankings/pvp] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  app.get(
    "/rankings/pk",
    { preHandler: authenticate },
    async (req, reply) => {
      try {
        reply.send(await topChars(pool, "pkkills"));
      } catch (e) {
        req.log.error({ err: e }, "[/rankings/pk] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  app.get(
    "/rankings/clans",
    { preHandler: authenticate },
    async (req, reply) => {
      try {
        const [rows] = await pool.query(
          `SELECT
             cd.clan_name,
             cd.clan_level,
             cd.reputation_score,
             (SELECT COUNT(*) FROM characters WHERE clanid = cd.clan_id) AS members,
             c.char_name AS leader_name
           FROM clan_data cd
           LEFT JOIN characters c ON c.obj_Id = cd.leader_id
           WHERE cd.enabled = 1
           ORDER BY cd.clan_level DESC, cd.reputation_score DESC
           LIMIT 50`,
        );
        const list = (rows as ClanRankRow[]).map((r, i) => ({
          rank: i + 1,
          name: r.clan_name,
          level: r.clan_level,
          reputation: r.reputation_score,
          members: Number(r.members),
          leader: r.leader_name,
        }));
        reply.send(list);
      } catch (e) {
        req.log.error({ err: e }, "[/rankings/clans] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );
}
