/**
 * GET /health — sem auth. Usado por uptime monitors e Cloudflare Tunnel.
 * Retorna 200 sempre que o processo está vivo. Pra checar DB, use /status.
 */
import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      ok: true,
      service: "l2impure-bridge",
      timestamp: Date.now(),
    };
  });
}
