/**
 * Config de eventos do gameserver — o painel admin edita EventConfigs
 * no Postgres (site) e chama a bridge pra materializar as mudanças nos
 * .properties do aCis. Nada aqui recompila Java: é só texto.
 *
 * Endpoints (ambos preHandler authenticate — HMAC de headers, mesmo
 * contrato de src/lib/bridge.ts no Next):
 *
 *   POST /config/apply
 *     { file: "events.properties", changes: { "AltOlyStartTime": "18" }, appliedBy }
 *     → whitelist de arquivos (path traversal impossível)
 *     → substitui SÓ as linhas `Key = value` (comentários e ordem intactos)
 *     → todas as keys precisam existir no arquivo, senão 422 sem escrever nada
 *     → backup <arquivo>.bak-<timestamp> antes de salvar (write tmp + rename)
 *     → audit em l2jdb.gameserver_config_audit
 *
 *   POST /config/reload-events   { appliedBy }
 *     → aCis NÃO tem reload de properties em runtime (Config é lido no
 *       boot; os engines de evento agendam no startup). SIGHUP não existe.
 *       Único método confiável: systemctl restart l2j-game.
 *     → audit com file_path "<restart:l2j-game>"
 *
 * IMPORTANTE: mudanças só valem depois do restart — o painel deixa isso
 * explícito (lastAppliedAt vs restart).
 */
import { copyFile, readFile, rename, writeFile } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";
import { authenticate } from "../auth.js";

const execAsync = promisify(exec);

const CONFIG_BASE = "/root/l2j-server/gameserver/config";

/** Whitelist exata — nunca derive paths de input do usuário. */
const ALLOWED_FILES = new Set([
  "events.properties",
  "events/eventengine.properties",
  "events/killTheBossEvent.properties",
  "events/partyfarm.properties",
  "events/pcBangEvent.properties",
  "events/pvpEvent.properties",
  "events/tournament.properties",
]);

const KEY_RE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const MAX_CHANGES = 50;
const MAX_VALUE_LEN = 4096;

function backupSuffix(): string {
  // 2026-07-12T01-02-03 — legível e ordenável no ls
  return new Date().toISOString().replace(/\.\d+Z$/, "").replace(/:/g, "-");
}

/** true/True/False etc já vêm formatados do site; aqui só sanidade. */
function sanitizeValue(v: unknown): string | null {
  let s: string;
  if (typeof v === "boolean") s = v ? "True" : "False";
  else if (typeof v === "number" && Number.isFinite(v)) s = String(v);
  else if (typeof v === "string") s = v.trim();
  else return null;
  if (s.length > MAX_VALUE_LEN) return null;
  // Properties injection: newline no valor viraria key nova
  if (/[\r\n\0\\]/.test(s)) return null;
  return s;
}

async function auditInsert(
  filePath: string,
  changes: Record<string, string>,
  backupPath: string,
  appliedBy: string,
): Promise<void> {
  // Audit nunca derruba a operação principal — log e segue.
  try {
    await pool.query(
      "INSERT INTO gameserver_config_audit (file_path, changes, backup_path, applied_by) VALUES (?, ?, ?, ?)",
      [filePath, JSON.stringify(changes), backupPath, appliedBy],
    );
  } catch (e) {
    console.error("[config-audit] insert failed:", (e as Error).message);
  }
}

export async function gameserverConfigRoutes(app: FastifyInstance) {
  app.post<{
    Body: {
      file?: string;
      changes?: Record<string, unknown>;
      appliedBy?: string;
    };
  }>("/config/apply", { preHandler: authenticate }, async (req, reply) => {
    const { file, changes, appliedBy } = req.body || {};

    if (typeof file !== "string" || !ALLOWED_FILES.has(file)) {
      reply.code(400).send({ error: "invalid_file", allowed: [...ALLOWED_FILES] });
      return;
    }
    if (
      changes === null ||
      typeof changes !== "object" ||
      Array.isArray(changes) ||
      Object.keys(changes).length === 0 ||
      Object.keys(changes).length > MAX_CHANGES
    ) {
      reply.code(400).send({ error: "invalid_changes" });
      return;
    }
    if (typeof appliedBy !== "string" || appliedBy.length === 0 || appliedBy.length > 128) {
      reply.code(400).send({ error: "invalid_applied_by" });
      return;
    }

    // Valida keys + valores antes de tocar em disco
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(changes)) {
      if (!KEY_RE.test(k)) {
        reply.code(400).send({ error: "invalid_key", key: k });
        return;
      }
      const s = sanitizeValue(v);
      if (s === null) {
        reply.code(400).send({ error: "invalid_value", key: k });
        return;
      }
      clean[k] = s;
    }

    const absPath = path.join(CONFIG_BASE, file);

    let content: string;
    try {
      content = await readFile(absPath, "utf8");
    } catch (e) {
      req.log.error({ err: e, file }, "[config/apply] read failed");
      reply.code(500).send({ error: "read_failed" });
      return;
    }

    // Substitui linha a linha. Só a PRIMEIRA ocorrência de cada key
    // (padrão properties); linhas de comentário nunca casam (^\s*Key\s*=).
    const lines = content.split("\n");
    const pending = new Set(Object.keys(clean));
    const changedKeys: string[] = [];
    for (let i = 0; i < lines.length && pending.size > 0; i++) {
      const line = lines[i]!;
      const m = /^(\s*)([A-Za-z][A-Za-z0-9_]*)(\s*=\s*)/.exec(line);
      if (!m) continue;
      const key = m[2]!;
      if (!pending.has(key)) continue;
      // Preserva indentação e o estilo "Key = " original do arquivo
      const hadCR = line.endsWith("\r");
      lines[i] = `${m[1]}${key}${m[3]}${clean[key]}${hadCR ? "\r" : ""}`;
      pending.delete(key);
      changedKeys.push(key);
    }

    if (pending.size > 0) {
      reply.code(422).send({
        error: "keys_not_found",
        missing: [...pending],
        hint: "nenhuma mudança foi escrita — corrija o fileMapping no site",
      });
      return;
    }

    const backupPath = `${absPath}.bak-${backupSuffix()}`;
    const tmpPath = `${absPath}.tmp-apply`;
    try {
      await copyFile(absPath, backupPath);
      await writeFile(tmpPath, lines.join("\n"), "utf8");
      await rename(tmpPath, absPath); // atômico no mesmo fs
    } catch (e) {
      req.log.error({ err: e, file }, "[config/apply] write failed");
      reply.code(500).send({ error: "write_failed" });
      return;
    }

    await auditInsert(file, clean, backupPath, appliedBy);
    req.log.info({ file, changedKeys, appliedBy }, "[config/apply] aplicado");
    reply.send({
      ok: true,
      file,
      backup_path: backupPath,
      changed_keys: changedKeys,
      restart_required: true,
    });
  });

  app.post<{ Body: { appliedBy?: string } }>(
    "/config/reload-events",
    { preHandler: authenticate },
    async (req, reply) => {
      const appliedBy =
        typeof req.body?.appliedBy === "string" && req.body.appliedBy.length <= 128
          ? req.body.appliedBy
          : "unknown";
      try {
        const { stdout, stderr } = await execAsync("systemctl restart l2j-game", {
          timeout: 30000,
        });
        await auditInsert("<restart:l2j-game>", {}, "-", appliedBy);
        req.log.info({ appliedBy }, "[config/reload-events] gameserver reiniciado");
        reply.send({
          ok: true,
          restart_method: "systemctl restart l2j-game",
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      } catch (e) {
        const err = e as Error & { stderr?: string };
        req.log.error({ err }, "[config/reload-events] restart failed");
        reply.code(500).send({
          error: "restart_failed",
          message: err.message,
          stderr: err.stderr,
        });
      }
    },
  );
}
