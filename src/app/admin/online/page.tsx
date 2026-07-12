import { bridge } from "@/lib/bridge";
import { detectCity } from "@/lib/l2j-cities";
import {
  OnlinePlayersPanel,
  type OnlinePlayerRow,
} from "@/components/admin/OnlinePlayersPanel";

export const dynamic = "force-dynamic";

/**
 * /admin/online — jogadores in-game em tempo real.
 * SSR carrega o snapshot inicial direto da bridge; o painel client
 * assume com auto-refresh 5s via /api/admin/online.
 * Auth: AdminLayout já roda requireAdminOrRedirect.
 */
export default async function AdminOnlinePage() {
  let players: OnlinePlayerRow[] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const data = await bridge.onlinePlayers({ limit: 100 });
    total = data.total;
    players = data.players.map((p) => ({
      ...p,
      city: detectCity(p.x, p.y) ?? `[${p.x}, ${p.y}]`,
    }));
  } catch {
    error = "Bridge indisponível — o painel tenta de novo a cada 5s";
  }

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Jogadores online
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-white/55">
        Personagens in-game agora (MySQL do L2J via bridge, refresh 5s).
        Kick entra na fila GM — exige PIN desbloqueado no Game master.
      </p>
      <OnlinePlayersPanel
        initial={{ players, total, timestamp: Date.now(), error }}
      />
    </>
  );
}
