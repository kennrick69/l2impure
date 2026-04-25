/**
 * GET /characters/:login — autenticado.
 * Retorna lista de personagens da conta de jogo informada.
 */
import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";
import { authenticate } from "../auth.js";
import { classIdToName } from "../l2j.js";

type CharRow = {
  char_name: string;
  classid: number;
  level: number;
  online: number;
  pvpkills: number;
  pkkills: number;
  clanid: number;
  clan_name: string | null;
};

export async function characterRoutes(app: FastifyInstance) {
  /**
   * GET /characters/max-level/:login — autenticado.
   * Retorna o maior level de qualquer personagem da conta. Usado pelo
   * Next pra checar se uma indicação convergiu (level >= 40).
   *
   * Atenção: registrado ANTES do /:login pra Fastify casar a rota
   * estática primeiro.
   */
  app.get<{ Params: { login: string } }>(
    "/characters/max-level/:login",
    { preHandler: authenticate },
    async (req, reply) => {
      const { login } = req.params;
      if (!/^[A-Za-z0-9]{4,45}$/.test(login)) {
        reply.code(400).send({ error: "invalid login" });
        return;
      }
      try {
        const [rows] = await pool.query(
          "SELECT MAX(level) AS max_level FROM characters WHERE account_name = ?",
          [login],
        );
        const max =
          (rows as Array<{ max_level: number | null }>)[0]?.max_level ?? 0;
        reply.send({ login, maxLevel: max ?? 0 });
      } catch (e) {
        req.log.error(
          { err: e },
          "[/characters/max-level/:login] failed",
        );
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  app.get<{ Params: { login: string } }>(
    "/characters/:login",
    { preHandler: authenticate },
    async (req, reply) => {
      const { login } = req.params;
      if (!/^[A-Za-z0-9]{4,45}$/.test(login)) {
        reply.code(400).send({ error: "invalid login" });
        return;
      }
      try {
        const [rows] = await pool.query(
          `SELECT
             c.char_name,
             c.classid,
             c.level,
             c.online,
             c.pvpkills,
             c.pkkills,
             c.clanid,
             cd.clan_name
           FROM characters c
           LEFT JOIN clan_data cd ON cd.clan_id = c.clanid
           WHERE c.account_name = ?
           ORDER BY c.level DESC, c.char_name ASC`,
          [login],
        );
        const list = (rows as CharRow[]).map((r) => ({
          name: r.char_name,
          classId: r.classid,
          className: classIdToName(r.classid),
          level: r.level,
          online: r.online > 0,
          pvp: r.pvpkills,
          pk: r.pkkills,
          clanId: r.clanid || null,
          clanName: r.clan_name,
        }));
        reply.send({ login, characters: list, count: list.length });
      } catch (e) {
        const err = e as Error;
        req.log.error({ err }, "[/characters/:login] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );
}
