import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { isGmUnlocked, gmSessionTtl } from "@/lib/gm-pin";
import { GameMasterPanel } from "@/components/admin/GameMasterPanel";
import { PinSetupForm, PinUnlockForm } from "@/components/admin/GmPinForms";

export default async function AdminGameMasterPage() {
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
        Game master
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-white/55">
        Ferramentas de GM ligadas direto na bridge. Ações em personagem
        exigem que ele esteja offline — se logado, espera deslogar.
      </p>

      {!hasPin ? (
        <PinSetupForm />
      ) : !unlocked ? (
        <PinUnlockForm />
      ) : (
        <>
          <PinSessionBanner ttlSeconds={ttl} />
          <GameMasterPanel />
        </>
      )}
    </>
  );
}

function PinSessionBanner({ ttlSeconds }: { ttlSeconds: number }) {
  const minutes = Math.max(0, Math.ceil(ttlSeconds / 60));
  return (
    <div className="mb-6 flex items-center justify-between gap-3 rounded-md border border-l2-green/30 bg-l2-green/5 px-4 py-2.5 text-xs">
      <span className="text-l2-green">
        🔓 Sessão GM ativa · expira em ~{minutes} min
      </span>
      <span className="text-white/45">
        Após expirar, você precisa digitar o PIN de novo.
      </span>
    </div>
  );
}
