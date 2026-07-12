import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { bridge, BridgeError } from "@/lib/bridge";
import {
  EVENT_CATALOG,
  validateEventConfig,
  toPropertiesValue,
  expandMultilineChanges,
} from "@/lib/event-config-catalog";

/**
 * PATCH /api/admin/events/[slug] — salva a config do evento no Postgres
 * E aplica no .properties da VPS via bridge (POST /config/apply).
 *
 * Fluxo transacional manual:
 *   1. valida via catálogo (zod só na forma; semântica no catálogo)
 *   2. update Postgres
 *   3. bridge apply → se falhar, REVERT do Postgres e 502
 *   4. sucesso → lastAppliedAt = now + audit
 *
 * Mudança só vale no jogo após restart do gameserver (botão Reload).
 */
const schema = z
  .object({
    enabled: z.boolean(),
    config: z.record(z.string(), z.unknown()),
  })
  .strict();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const rl = await rateLimit("admin_events_apply", clientIp(req), 30, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  const { slug } = await params;
  const def = EVENT_CATALOG[slug];
  if (!def) {
    return NextResponse.json({ error: "Evento desconhecido" }, { status: 404 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { errors, normalized } = validateEventConfig(slug, body.config);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Campos inválidos", fields: errors },
      { status: 400 },
    );
  }

  const current = await prisma.eventConfig.findUnique({ where: { slug } });
  if (!current) {
    return NextResponse.json(
      { error: "Config não existe no banco (migration/seed pendente?)" },
      { status: 404 },
    );
  }

  // Monta as mudanças pro properties via fileMapping do banco
  const mapping = current.fileMapping as Record<string, string>;
  const fieldTypes = new Map(def.fields.map((f) => [f.key, f.type]));
  const changes: Record<string, string> = {};
  for (const [field, value] of Object.entries(normalized)) {
    // multiline (welcome): "a\nb" vira Line1..Line5 via mapping `${field}N`
    if (fieldTypes.get(field) === "multiline") {
      expandMultilineChanges(field, String(value), mapping, changes);
      continue;
    }
    const propKey = mapping[field];
    if (propKey) changes[propKey] = toPropertiesValue(value);
  }
  if (def.hasEnabledToggle && mapping.enabled) {
    changes[mapping.enabled] = toPropertiesValue(body.enabled);
  }
  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: "Nada pra aplicar" }, { status: 400 });
  }

  // 1) Persiste no Postgres (guarda o estado anterior pro revert)
  const previous = {
    enabled: current.enabled,
    config: current.config,
    lastAppliedAt: current.lastAppliedAt,
  };
  await prisma.eventConfig.update({
    where: { slug },
    data: { enabled: body.enabled, config: normalized },
  });

  // 2) Aplica na VPS via bridge
  let applyResult;
  try {
    applyResult = await bridge.config.apply(
      current.fileTarget,
      changes,
      admin.email,
    );
  } catch (e) {
    // Revert do Postgres — painel volta a refletir o que está na VPS
    await prisma.eventConfig
      .update({
        where: { slug },
        data: {
          enabled: previous.enabled,
          config: previous.config as never,
          lastAppliedAt: previous.lastAppliedAt,
        },
      })
      .catch(() => {});
    const message =
      e instanceof BridgeError ? e.message : "Falha inesperada na bridge";
    return NextResponse.json(
      { error: `Bridge falhou — nada foi alterado: ${message}` },
      { status: e instanceof BridgeError ? 502 : 500 },
    );
  }

  const updated = await prisma.eventConfig.update({
    where: { slug },
    data: { lastAppliedAt: new Date() },
  });

  await audit({
    userId: admin.userId,
    action: "admin_apply_event_config",
    ipAddress: clientIp(req),
    details: {
      slug,
      file: current.fileTarget,
      changes,
      backupPath: applyResult.backup_path,
    },
  });

  return NextResponse.json({
    ok: true,
    event: updated,
    changedKeys: applyResult.changed_keys,
    backupPath: applyResult.backup_path,
    restartRequired: true,
  });
}
