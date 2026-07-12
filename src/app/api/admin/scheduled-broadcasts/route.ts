import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, AdminError } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { bridgeFetch, BridgeError } from "@/lib/bridge";
import { isGmUnlocked } from "@/lib/gm-pin";

/**
 * Broadcasts agendados (tabela scheduled_gm_commands na VPS; o scheduler
 * da bridge dispara pra fila gm_commands quando chega a hora).
 *
 * POST /api/admin/scheduled-broadcasts {message, scheduledAt} — exige PIN GM
 *      desbloqueado (mesmo gate do broadcast imediato do Console GM).
 * GET  /api/admin/scheduled-broadcasts?status=pending|fired|cancelled&limit=
 */

function bridgeFail(e: unknown) {
  if (e instanceof BridgeError) {
    return NextResponse.json(
      { error: `Bridge falhou (${e.status})` },
      { status: 502 },
    );
  }
  console.error("[/api/admin/scheduled-broadcasts]", e);
  return NextResponse.json(
    { error: "Erro de rede com a bridge" },
    { status: 502 },
  );
}

export type ScheduledCommandDto = {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  requestedBy: string;
  requestedAt: string | null;
  scheduledAt: string | null;
  firedAt: string | null;
  gmCommandId: number | null;
  cancelledAt: string | null;
  status: "pending" | "fired" | "cancelled";
};

const createSchema = z.object({
  message: z.string().trim().min(1).max(500),
  // ISO 8601 vindo do cliente (datetime-local convertido pra UTC no browser)
  scheduledAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
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

  // Broadcast agendado = broadcast: mesmo gate de PIN do Console GM
  if (!(await isGmUnlocked(admin.userId))) {
    return NextResponse.json(
      {
        error: "Sessão GM expirada. Insira o PIN novamente.",
        code: "pin_required",
      },
      { status: 403 },
    );
  }

  const rl = await rateLimit(
    "admin_scheduled_broadcasts",
    String(admin.userId),
    30,
    60,
  );
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const when = new Date(body.scheduledAt);
  if (Number.isNaN(when.getTime())) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }
  if (when.getTime() < Date.now() - 60_000) {
    return NextResponse.json(
      { error: "Horário no passado — escolha um horário futuro" },
      { status: 400 },
    );
  }

  let created: {
    ok: boolean;
    scheduled: { id: number; scheduledAt: string; status: string };
  };
  try {
    created = await bridgeFetch("POST", "/scheduled-commands", {
      type: "broadcast",
      payload: { message: body.message },
      requestedBy: admin.email,
      scheduledAt: when.toISOString(),
    });
  } catch (e) {
    return bridgeFail(e);
  }

  await audit({
    userId: admin.userId,
    action: "admin_scheduled_broadcast_create",
    ipAddress: clientIp(req),
    details: {
      scheduledId: created.scheduled.id,
      message: body.message,
      scheduledAt: when.toISOString(),
    },
  });

  return NextResponse.json(
    { ok: true, scheduled: created.scheduled },
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

  const rl = await rateLimit(
    "admin_scheduled_broadcasts_list",
    clientIp(req),
    120,
    60,
  );
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
    200,
  );
  const qs = new URLSearchParams({ limit: String(limit) });
  if (status && ["pending", "fired", "cancelled"].includes(status)) {
    qs.set("status", status);
  }

  try {
    const data = await bridgeFetch<{ scheduled: ScheduledCommandDto[] }>(
      "GET",
      `/scheduled-commands?${qs.toString()}`,
    );
    return NextResponse.json(data);
  } catch (e) {
    return bridgeFail(e);
  }
}
