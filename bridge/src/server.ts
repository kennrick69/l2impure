/**
 * Entry point da bridge. Roda atrás de Cloudflare Tunnel
 * (cloudflared) — bind em 127.0.0.1:8080 só pra evitar exposição direta.
 */
import Fastify from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./env.js";
import { pingDb, pool } from "./db.js";
import { healthRoutes } from "./routes/health.js";
import { statusRoutes } from "./routes/status.js";
import { accountRoutes } from "./routes/accounts.js";
import { characterRoutes } from "./routes/characters.js";
import { rankingRoutes } from "./routes/rankings.js";
import { serverRoutes } from "./routes/server.js";
import { adminRoutes } from "./routes/admin.js";
import { adminCharactersRoutes } from "./routes/admin-characters.js";
import { adminItemsRoutes } from "./routes/admin-items.js";
import { adminNpcsRoutes } from "./routes/admin-npcs.js";
import { iconsRoutes } from "./routes/icons.js";
import { voteRoutes } from "./routes/vote.js";

async function build() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } }
          : undefined,
    },
    trustProxy: true,
  });

  // Captura raw body — o middleware HMAC precisa do body original
  // (não o parsed pelo Fastify) pra recomputar a assinatura.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      const raw = body as string;
      (req as typeof req & { rawBody?: string }).rawBody = raw;
      try {
        const json = raw.length === 0 ? {} : JSON.parse(raw);
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  // Form-urlencoded: usado pelo callback do L2Top.CO (POST com userid=X&voted=1)
  app.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string" },
    (req, body, done) => {
      const raw = body as string;
      (req as typeof req & { rawBody?: string }).rawBody = raw;
      try {
        const params = new URLSearchParams(raw);
        const obj: Record<string, string> = {};
        for (const [k, v] of params) obj[k] = v;
        done(null, obj);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  // CORP=cross-origin: necessário pra <img src> de l2impure.com poder
  // embedar /icons/items/*.png. Bridge já é protegida por HMAC nos
  // endpoints sensíveis, sem risco de leak por embed.
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
  await app.register(rateLimit, {
    max: 60,
    timeWindow: "1 minute",
  });

  await app.register(healthRoutes);
  await app.register(statusRoutes);
  await app.register(accountRoutes);
  await app.register(characterRoutes);
  await app.register(rankingRoutes);
  await app.register(serverRoutes);
  await app.register(adminRoutes);
  await app.register(adminCharactersRoutes);
  await app.register(adminItemsRoutes);
  await app.register(adminNpcsRoutes);
  await app.register(iconsRoutes);
  await app.register(voteRoutes);

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: "not found" });
  });

  return app;
}

async function start() {
  const app = await build();

  // Confirmar DB antes de aceitar requests
  const dbOk = await pingDb();
  if (!dbOk) {
    app.log.warn("[startup] MySQL não respondeu ao ping inicial — seguindo mesmo assim");
  } else {
    app.log.info("[startup] MySQL ok");
  }

  await app.listen({ host: env.HOST, port: env.PORT });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`[shutdown] sinal ${signal} recebido`);
    try {
      await app.close();
      await pool.end();
    } catch (e) {
      app.log.error({ err: e }, "[shutdown] erro");
    }
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

start().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
