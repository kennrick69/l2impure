import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, AuthError } from "@/lib/auth";

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
  const u = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { coins: true },
  });
  return NextResponse.json({ coins: u?.coins ?? 0 });
}
