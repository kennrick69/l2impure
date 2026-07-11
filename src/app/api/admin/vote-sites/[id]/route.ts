import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * PATCH /api/admin/vote-sites/[id] — edita campos operacionais de um
 * ranking de voto. Aceita 1 campo por vez ou lote (todos opcionais).
 *
 * slug/displayName/callbackUrl/callbackMethod NÃO são editáveis — são
 * contrato com a bridge (rotas de callback) e mudam só via código.
 */
const schema = z
  .object({
    serverId: z.string().trim().max(64).nullable().optional(),
    active: z.boolean().optional(),
    cooldownHours: z.number().int().min(1).max(168).optional(),
    rewardCoins: z.number().int().min(0).max(100_000).optional(),
    rewardDescription: z.string().trim().max(255).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const rl = await rateLimit("admin_vote_sites", clientIp(req), 120, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  const { id } = await params;
  const siteId = Number(id);
  if (!Number.isFinite(siteId) || siteId <= 0) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  // "" → null nos campos texto opcionais (limpar input no painel)
  const data = {
    ...body,
    ...(body.serverId !== undefined && { serverId: body.serverId || null }),
    ...(body.rewardDescription !== undefined && {
      rewardDescription: body.rewardDescription || null,
    }),
    ...(body.notes !== undefined && { notes: body.notes || null }),
  };

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada pra atualizar" }, { status: 400 });
  }

  const updated = await prisma.voteSite
    .update({ where: { id: siteId }, data })
    .catch(() => null);
  if (!updated) {
    return NextResponse.json({ error: "Site não encontrado" }, { status: 404 });
  }

  await audit({
    userId: admin.userId,
    action: "admin_update_vote_site",
    ipAddress: clientIp(req),
    details: { siteId, slug: updated.slug, changes: data },
  });

  return NextResponse.json({ ok: true, site: updated });
}
