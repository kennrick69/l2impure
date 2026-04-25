/**
 * GET /status — autenticado.
 * Retorna { online, players, dbOk, gameServerReachable }.
 *
 * - online = servidor de jogo aceita conexão TCP (porta 7777 default)
 * - players = COUNT(*) FROM characters WHERE online > 0 (L2J usa 0/1)
 * - dbOk = SELECT 1 funcionou
 */
import { connect } from "node:net";
import type { FastifyInstance } from "fastify";
import { pool, pingDb } from "../db.js";
import { env } from "../env.js";
import { authenticate } from "../auth.js";

function tcpProbe(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect(port, host);
    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      cleanup();
      resolve(true);
    });
    socket.once("error", () => {
      clearTimeout(timer);
      cleanup();
      resolve(false);
    });
  });
}

export async function statusRoutes(app: FastifyInstance) {
  app.get(
    "/status",
    { preHandler: authenticate },
    async (_req, reply) => {
      const dbOk = await pingDb();

      let players = 0;
      if (dbOk) {
        try {
          const [rows] = await pool.query(
            "SELECT COUNT(*) AS c FROM characters WHERE online > 0",
          );
          const first = (rows as Array<{ c: number }>)[0];
          if (first && typeof first.c === "number") players = first.c;
        } catch {
          // mantém players=0 se a query falhar
        }
      }

      const gameServerReachable = await tcpProbe(
        env.L2J_GAME_HOST,
        env.L2J_GAME_PORT,
      );
      const loginServerReachable = await tcpProbe(
        env.L2J_LOGIN_HOST,
        env.L2J_LOGIN_PORT,
      );

      const online = gameServerReachable && loginServerReachable && dbOk;
      reply.send({
        online,
        players,
        dbOk,
        gameServerReachable,
        loginServerReachable,
        timestamp: Date.now(),
      });
    },
  );
}

