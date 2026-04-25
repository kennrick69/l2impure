/**
 * POST /accounts/create — autenticado.
 * Body: { login: string, password: string }
 *
 * Cria conta na tabela `accounts` do L2J:
 *   login (PK varchar 45), password (varchar 255 — SHA1+Base64),
 *   access_level=0 (default), lastServer=1 (default)
 *
 * Schema confirmado em prod (2026-04-25): coluna é `access_level`
 * (snake_case), não `accessLevel`.
 *
 * Retorna 201 + { ok:true, login } | 409 se login já existe.
 */
import type { FastifyInstance } from "fastify";
import type { ResultSetHeader } from "mysql2";
import { z } from "zod";
import { pool } from "../db.js";
import { authenticate } from "../auth.js";
import { l2jPasswordHash } from "../l2j.js";

const CreateBody = z.object({
  login: z
    .string()
    .min(4)
    .max(45)
    .regex(/^[A-Za-z0-9]+$/, "alfanumérico"),
  password: z.string().min(6).max(45),
});

const ResetHwidBody = z.object({
  login: z
    .string()
    .min(4)
    .max(45)
    .regex(/^[A-Za-z0-9]+$/, "alfanumérico"),
});

export async function accountRoutes(app: FastifyInstance) {
  app.post(
    "/accounts/create",
    { preHandler: authenticate },
    async (req, reply) => {
      const parsed = CreateBody.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({
          error: "invalid body",
          details: parsed.error.flatten(),
        });
        return;
      }
      const { login, password } = parsed.data;
      const hash = l2jPasswordHash(password);

      // Verifica se o login já existe (anti race-condition o INSERT abaixo
      // também checa via PK, mas o erro é mais limpo aqui)
      try {
        const [existing] = await pool.query(
          "SELECT login FROM accounts WHERE login = ? LIMIT 1",
          [login],
        );
        if (Array.isArray(existing) && existing.length > 0) {
          reply.code(409).send({ error: "login already exists" });
          return;
        }

        await pool.query(
          "INSERT INTO accounts (login, password, access_level, lastServer) VALUES (?, ?, 0, 1)",
          [login, hash],
        );
        reply.code(201).send({ ok: true, login });
      } catch (e) {
        const err = e as Error & { code?: string };
        // Em race condition, MySQL devolve ER_DUP_ENTRY (1062)
        if (err.code === "ER_DUP_ENTRY") {
          reply.code(409).send({ error: "login already exists" });
          return;
        }
        req.log.error({ err }, "[/accounts/create] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );

  /**
   * POST /accounts/reset-hwid — autenticado.
   * Body: { login }
   * Limpa o lock por IP/HWID da conta no L2J.
   *
   * Schema deste fork tem `lastIP` mas NÃO `lastHWID` — só `lastIP=''`
   * é aplicado. Em forks que adicionem a coluna, expandir aqui.
   *
   * Rate-limit (1 por semana / conta) é feito no Next, não aqui.
   */
  app.post(
    "/accounts/reset-hwid",
    { preHandler: authenticate },
    async (req, reply) => {
      const parsed = ResetHwidBody.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({
          error: "invalid body",
          details: parsed.error.flatten(),
        });
        return;
      }
      const { login } = parsed.data;
      try {
        const [result] = await pool.query<ResultSetHeader>(
          "UPDATE accounts SET lastIP = '' WHERE login = ?",
          [login],
        );
        if (result.affectedRows === 0) {
          reply.code(404).send({ error: "account not found" });
          return;
        }
        reply.send({ ok: true, login });
      } catch (e) {
        req.log.error({ err: e }, "[/accounts/reset-hwid] failed");
        reply.code(500).send({ error: "internal error" });
      }
    },
  );
}
