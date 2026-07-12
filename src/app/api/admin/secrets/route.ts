import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import {
  SECRET_CATALOG,
  bootstrapSecrets,
  decrypt,
  maskSecret,
} from "@/lib/secrets";

/**
 * GET /api/admin/secrets — lista secrets com valores SEMPRE mascarados
 * (primeiros 8 + últimos 4 chars). Plaintext completo NUNCA sai daqui.
 * O bootstrap roda antes: semeia linhas do catálogo e importa env vars
 * MP_* pro DB (encriptadas) na primeira abertura do painel.
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  await bootstrapSecrets();

  const rows = await prisma.adminSecret.findMany({ orderBy: { key: "asc" } });
  const catalogByKey = new Map(SECRET_CATALOG.map((d) => [d.key, d]));

  const secrets = rows.map((row) => {
    const def = catalogByKey.get(row.key);
    let masked = "";
    let decryptError = false;
    if (row.value) {
      try {
        masked = maskSecret(decrypt(row.value));
      } catch {
        decryptError = true;
      }
    }
    return {
      key: row.key,
      category: row.category,
      label: def?.label ?? row.key,
      description: row.description ?? def?.description ?? "",
      isSet: Boolean(row.value) && !decryptError,
      decryptError,
      maskedValue: masked,
      required: def?.required ?? false,
      envFallback: def?.envFallback ?? null,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
    };
  });

  return NextResponse.json({ secrets });
}
