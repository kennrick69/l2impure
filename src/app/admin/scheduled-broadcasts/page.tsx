import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { isGmUnlocked, gmSessionTtl } from "@/lib/gm-pin";
import { PinSetupForm, PinUnlockForm } from "@/components/admin/GmPinForms";
import { ScheduledBroadcasts } from "@/components/admin/ScheduledBroadcasts";

export const dynamic = "force-dynamic";

/**
 * Broadcasts agendados — a mensagem entra na fila GM no horário marcado
 * (scheduler da bridge, tick 30s) e o gameserver shouta in-game.
 * Agendar exige o mesmo PIN GM do broadcast imediato.
 */
export default async function AdminScheduledBroadcastsPage() {
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
        Broadcasts agendados
      </h1>
      <p className="mb-6 max-w-3xl text-sm text-white/55">
        Agende mensagens globais pro futuro — aviso de evento, manutenção,
        lembrete de vote. Horários em BRT. Precisão de ~30 segundos.
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
          <ScheduledBroadcasts />
        </>
      )}
    </>
  );
}
