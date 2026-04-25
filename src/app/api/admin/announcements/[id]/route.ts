import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  content: z.string().min(1).max(8000).optional(),
  archived: z.boolean().optional(),
});

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
  const { id } = await params;
  const annId = Number(id);
  if (!Number.isFinite(annId) || annId <= 0) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.content !== undefined) data.content = body.content;
  if (body.archived !== undefined) {
    data.archivedAt = body.archived ? new Date() : null;
  }

  const updated = await prisma.announcement
    .update({ where: { id: annId }, data, select: { id: true } })
    .catch(() => null);
  if (!updated) {
    return NextResponse.json(
      { error: "Anúncio não encontrado" },
      { status: 404 },
    );
  }

  await audit({
    userId: admin.userId,
    action: "admin_update_announcement",
    ipAddress: clientIp(req),
    details: { id: annId, ...data },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
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
  const { id } = await params;
  const annId = Number(id);
  if (!Number.isFinite(annId) || annId <= 0) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const deleted = await prisma.announcement
    .delete({ where: { id: annId }, select: { id: true } })
    .catch(() => null);
  if (!deleted) {
    return NextResponse.json(
      { error: "Anúncio não encontrado" },
      { status: 404 },
    );
  }

  await audit({
    userId: admin.userId,
    action: "admin_delete_announcement",
    ipAddress: clientIp(req),
    details: { id: annId },
  });
  return NextResponse.json({ ok: true });
}
