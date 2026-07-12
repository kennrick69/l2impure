import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { isGmUnlocked, gmSessionTtl } from "@/lib/gm-pin";
import { PinSetupForm, PinUnlockForm } from "@/components/admin/GmPinForms";
import { ModerationBans } from "@/components/admin/ModerationBans";

export const dynamic = "force-dynamic";

/**
 * Moderação — bans de conta. Banir/desbanir passa pela fila GM
 * (tipos ban_account/unban_account): o gameserver derruba a sessão ativa,
 * seta access_level negativo na accounts e grava histórico em account_bans.
 * Mesmo gate de PIN do Console GM.
 */
export default async function AdminModerationBansPage() {
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({
    where: { id: admin.userId },
    select: { gmPinHash: true },
  });
  const hasPin = Boolean(user?.gmPinHash);
  const unlocked = hasPin ? await isGmUnlocked(admin.userId) : false;
  const ttl = unlocked ? await gmSessionTtl(admin.userId) : 0;

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Moderação — bans de conta
      </h1>
      <p className="mb-6 max-w-3xl text-sm text-white/55">
        Banir desconecta a sessão ativa e bloqueia o login da conta
        (access_level negativo). Bans temporários expiram sozinhos; o
        histórico completo fica registrado. Executado pelo gameserver via
        fila GM — nada de editar banco na mão.
      </p>

      {!hasPin ? (
        <PinSetupForm />
      ) : !unlocked ? (
        <PinUnlockForm />
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between gap-3 rounded-md border border-l2-green/30 bg-l2-green/5 px-4 py-2.5 text-xs">
            <span className="text-l2-green">
              🔓 Sessão GM ativa · expira em ~
              {Math.max(0, Math.ceil(ttl / 60))} min
            </span>
            <span className="text-white/45">
              Após expirar, você precisa digitar o PIN de novo.
            </span>
          </div>
          <ModerationBans />
        </>
      )}
    </>
  );
}
