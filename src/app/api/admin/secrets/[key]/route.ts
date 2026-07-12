import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import { isGmUnlocked } from "@/lib/gm-pin";
import { audit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  SECRET_CATALOG,
  encrypt,
  invalidateCache,
  maskSecret,
} from "@/lib/secrets";

/**
 * PATCH /api/admin/secrets/[key] — atualiza um secret.
 * Body: { value: string } (string vazia limpa o secret).
 *
 * Gate duplo: requireAdmin + PIN GM desbloqueado (mesmo padrão do
 * gm-console — trocar credencial de pagamento é tão sensível quanto
 * dar item). Valor entra plaintext no body (HTTPS), sai encriptado
 * pro DB, e no audit log só vai a máscara.
 */
const schema = z.object({
  value: z.string().max(4096),
});

const VALID_KEYS = new Set(SECRET_CATALOG.map((d) => d.key));

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
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

  if (!(await isGmUnlocked(admin.userId))) {
    return NextResponse.json(
      {
        error:
          "Sessão GM expirada. Desbloqueie com seu PIN em /admin/game-master e tente de novo.",
        code: "pin_required",
      },
      { status: 403 },
    );
  }

  const rl = await rateLimit("admin_secrets", clientIp(req), 20, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  const { key: rawKey } = await params;
  const key = decodeURIComponent(rawKey);
  if (!VALID_KEYS.has(key)) {
    return NextResponse.json({ error: "Secret desconhecido" }, { status: 404 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const value = body.value.trim();
  const def = SECRET_CATALOG.find((d) => d.key === key);

  await prisma.adminSecret.upsert({
    where: { key },
    create: {
      key,
      value: value ? encrypt(value) : "",
      category: def?.category ?? "general",
      description: def?.description,
      updatedBy: admin.email,
    },
    update: {
      value: value ? encrypt(value) : "",
      updatedBy: admin.email,
    },
  });
  invalidateCache(key);

  await audit({
    userId: admin.userId,
    action: "admin_secret_updated",
    ipAddress: clientIp(req),
    details: {
      key,
      cleared: !value,
      maskedValue: value ? maskSecret(value) : null,
    },
  });

  return NextResponse.json({
    ok: true,
    key,
    isSet: Boolean(value),
    maskedValue: value ? maskSecret(value) : "",
  });
}
