import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { isGmUnlocked, gmSessionTtl } from "@/lib/gm-pin";
import { PinSetupForm, PinUnlockForm } from "@/components/admin/GmPinForms";
import { GmConsole } from "@/components/admin/GmConsole";

export const dynamic = "force-dynamic";

/**
 * Console GM (fila de comandos live) — broadcast, kick, dar item com o
 * personagem ONLINE. O gameserver polla a fila na bridge a cada 5s e
 * executa; nada aqui exige logar como GM in-game.
 *
 * Mesmo gate de PIN do /admin/game-master.
 */
export default async function AdminGmConsolePage() {
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
        Console GM — fila de comandos
      </h1>
      <p className="mb-6 max-w-3xl text-sm text-white/55">
        Comandos executados pelo gameserver AO VIVO (jogador online):
        broadcast, kick e entrega de item. O servidor busca a fila a cada
        poucos segundos — se um comando ficar parado em &quot;pending&quot;,
        o poller do gameserver não está rodando (handler Java pendente).
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
          <GmConsole />
        </>
      )}
    </>
  );
}
