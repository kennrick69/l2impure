/**
 * POST /server/restart — autenticado.
 * Reinicia o l2j-game.service via systemctl. Bridge roda como root
 * sob pm2, então não precisa de sudo. Timeout 15s.
 */
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { FastifyInstance } from "fastify";
import { authenticate } from "../auth.js";

const execAsync = promisify(exec);

export async function serverRoutes(app: FastifyInstance) {
  app.post(
    "/server/restart",
    { preHandler: authenticate },
    async (req, reply) => {
      try {
        const { stdout, stderr } = await execAsync(
          "systemctl restart l2j-game",
          { timeout: 15000 },
        );
        reply.send({
          ok: true,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      } catch (e) {
        const err = e as Error & { code?: number; stderr?: string };
        req.log.error({ err }, "[/server/restart] failed");
        reply.code(500).send({
          error: "restart failed",
          message: err.message,
          stderr: err.stderr,
        });
      }
    },
  );
}
