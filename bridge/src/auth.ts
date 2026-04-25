/**
 * Middleware Fastify de autenticação.
 *
 * Toda requisição precisa carregar:
 *   X-API-Key:    chave compartilhada (compare timing-safe)
 *   X-Timestamp:  epoch ms (max skew configurável, default 30s)
 *   X-Signature:  hex(HMAC-SHA256(timestamp + "." + method + path + "." + body))
 *
 * O contrato está espelhado em src/lib/bridge.ts do projeto Next no Railway.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";
import { env } from "./env.js";

function safeEq(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export async function authenticate(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const apiKey = req.headers["x-api-key"];
  const timestamp = req.headers["x-timestamp"];
  const signature = req.headers["x-signature"];

  if (
    typeof apiKey !== "string" ||
    typeof timestamp !== "string" ||
    typeof signature !== "string"
  ) {
    reply.code(401).send({ error: "missing auth headers" });
    return;
  }

  // 1) API key (timing-safe)
  if (!safeEq(apiKey, env.API_KEY)) {
    reply.code(401).send({ error: "invalid api key" });
    return;
  }

  // 2) Timestamp dentro da janela
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    reply.code(401).send({ error: "invalid timestamp" });
    return;
  }
  const skew = Math.abs(Date.now() - ts);
  if (skew > env.HMAC_MAX_SKEW_MS) {
    reply.code(401).send({ error: "timestamp out of window", skewMs: skew });
    return;
  }

  // 3) HMAC do request — formato: ts.METHODpath.body
  const method = req.method.toUpperCase();
  const path = req.url; // já contém querystring
  const rawBody = (req as FastifyRequest & { rawBody?: string }).rawBody ?? "";
  const payload = `${timestamp}.${method}${path}.${rawBody}`;
  const expected = createHmac("sha256", env.HMAC_SECRET)
    .update(payload)
    .digest("hex");

  if (!safeEq(signature, expected)) {
    reply.code(401).send({ error: "invalid signature" });
    return;
  }
}
