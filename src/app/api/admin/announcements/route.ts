import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

const schema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(8000),
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

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const created = await prisma.announcement.create({
    data: {
      title: body.title,
      content: body.content,
      createdById: admin.userId,
    },
    select: { id: true },
  });
  await audit({
    userId: admin.userId,
    action: "admin_create_announcement",
    ipAddress: clientIp(req),
    details: { id: created.id, title: body.title },
  });
  return NextResponse.json({ ok: true, id: created.id });
}
