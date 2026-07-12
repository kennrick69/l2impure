import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { isGmUnlocked } from "@/lib/gm-pin";
import {
  SECRET_CATALOG,
  bootstrapSecrets,
  decrypt,
  maskSecret,
} from "@/lib/secrets";
import { PinSetupForm, PinUnlockForm } from "@/components/admin/GmPinForms";
import {
  SecretsManager,
  type SecretDto,
} from "@/components/admin/SecretsManager";

export const dynamic = "force-dynamic";

export default async function AdminSecretsPage() {
  const admin = await requireAdmin();

  // Mesmo gate do /admin/game-master: trocar credencial de pagamento é
  // tão sensível quanto dar item — exige PIN desbloqueado.
  const user = await prisma.user.findUnique({
    where: { id: admin.userId },
    select: { gmPinHash: true },
  });
  const hasPin = Boolean(user?.gmPinHash);
  const unlocked = hasPin ? await isGmUnlocked(admin.userId) : false;

  let secrets: SecretDto[] = [];
  if (unlocked) {
    await bootstrapSecrets();
    const rows = await prisma.adminSecret.findMany();
    const rowByKey = new Map(rows.map((r) => [r.key, r]));
    // Ordem do catálogo primeiro; linhas extras (futuras) no fim
    const catalogKeys = new Set(SECRET_CATALOG.map((d) => d.key));
    const ordered = [
      ...SECRET_CATALOG.map((d) => rowByKey.get(d.key)).filter(
        (r): r is NonNullable<typeof r> => Boolean(r),
      ),
      ...rows.filter((r) => !catalogKeys.has(r.key)),
    ];
    secrets = ordered.map((row) => {
      const def = SECRET_CATALOG.find((d) => d.key === row.key);
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
  }

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Secrets
      </h1>
      <p className="mb-6 max-w-3xl text-sm text-white/55">
        Credenciais operacionais (Mercado Pago, etc) editáveis sem tocar no
        Railway. Valores ficam <strong className="text-white/80">criptografados
        (AES-256-GCM)</strong> no Postgres e têm prioridade sobre as env vars.
        Mudanças valem em até 30 segundos, sem redeploy.
      </p>

      {!hasPin ? (
        <PinSetupForm />
      ) : !unlocked ? (
        <PinUnlockForm />
      ) : (
        <SecretsManager initialSecrets={secrets} />
      )}
    </>
  );
}
