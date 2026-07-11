import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, AdminError } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { bridgeFetch, BridgeError } from "@/lib/bridge";
import { isGmUnlocked } from "@/lib/gm-pin";
import {
  GM_COMMAND_DEFS,
  isGmCommandType,
  type GmCommandDto,
} from "@/lib/gm-commands";

/**
 * Fila de comandos GM (executados pelo gameserver via polling na bridge).
 *
 * POST /api/admin/gm-commands  {type, payload, priority?} → cria na fila
 *      (exige sessão GM desbloqueada por PIN, igual /api/admin/gm)
 * GET  /api/admin/gm-commands?limit=&status= → lista (admin, sem PIN)
 */

function bridgeFail(e: unknown) {
  if (e instanceof BridgeError) {
    return NextResponse.json(
      { error: `Bridge falhou (${e.status})` },
      { status: 502 },
    );
  }
  console.error("[/api/admin/gm-commands]", e);
  return NextResponse.json(
    { error: "Erro de rede com a bridge" },
    { status: 502 },
  );
}

const createSchema = z.object({
  type: z.string(),
  payload: z.record(z.unknown()),
  priority: z.number().int().min(0).max(100).optional(),
});

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  // Mesma proteção do /api/admin/gm: ações live exigem PIN desbloqueado
  if (!(await isGmUnlocked(admin.userId))) {
    return NextResponse.json(
      {
        error: "Sessão GM expirada. Insira o PIN novamente.",
        code: "pin_required",
      },
      { status: 403 },
    );
  }

  const rl = await rateLimit("admin_gm_commands", String(admin.userId), 30, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  let raw: z.infer<typeof createSchema>;
  try {
    raw = createSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  if (!isGmCommandType(raw.type)) {
    return NextResponse.json(
      { error: `Tipo de comando desconhecido: ${raw.type}` },
      { status: 400 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = GM_COMMAND_DEFS[raw.type].schema.parse(raw.payload);
  } catch (e) {
    const msg =
      e instanceof z.ZodError
        ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        : "payload inválido";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  let created: { ok: boolean; command: { id: number; status: string } };
  try {
    created = await bridgeFetch("POST", "/gm-commands", {
      type: raw.type,
      payload,
      requestedBy: admin.email,
      priority: raw.priority ?? 0,
    });
  } catch (e) {
    return bridgeFail(e);
  }

  await audit({
    userId: admin.userId,
    action: "admin_gm_command_create",
    ipAddress: clientIp(req),
    details: {
      commandId: created.command.id,
      type: raw.type,
      payload,
      priority: raw.priority ?? 0,
    },
  });

  return NextResponse.json(
    { ok: true, command: created.command },
    { status: 201 },
  );
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const rl = await rateLimit("admin_gm_commands_list", clientIp(req), 120, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
    200,
  );
  const status = url.searchParams.get("status");
  const qs = status
    ? `?limit=${limit}&status=${encodeURIComponent(status)}`
    : `?limit=${limit}`;

  try {
    const data = await bridgeFetch<{ commands: GmCommandDto[] }>(
      "GET",
      `/gm-commands${qs}`,
    );
    return NextResponse.json(data);
  } catch (e) {
    return bridgeFail(e);
  }
}
