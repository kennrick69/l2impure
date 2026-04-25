import { bridge } from "@/lib/bridge";
import { getSetting, SETTINGS } from "@/lib/settings";
import { ServerControls } from "@/components/admin/ServerControls";

export default async function AdminServerPage() {
  let status: Awaited<ReturnType<typeof bridge.status>> | null = null;
  try {
    status = await bridge.status();
  } catch (e) {
    console.warn("[admin/server] bridge.status falhou:", (e as Error).message);
  }
  const offsetOverride = await getSetting<number | null>(
    SETTINGS.playerCountOffset,
    null,
  );

  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Controle do servidor
      </h1>

      <section className="mb-8 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-white">
          Status atual
        </h2>
        {!status ? (
          <p className="text-sm text-l2-red">Bridge não respondeu.</p>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <Stat
              label="Online"
              value={
                status.online ? (
                  <span className="text-l2-green">SIM</span>
                ) : (
                  <span className="text-l2-red">NÃO</span>
                )
              }
            />
            <Stat
              label="Players (real)"
              value={
                <span className="text-white">{status.playersRaw ?? "?"}</span>
              }
            />
            <Stat
              label="Players (mostrado)"
              value={<span className="text-l2-gold">{status.players}</span>}
            />
            <Stat
              label="DB ok"
              value={
                status.dbOk ? (
                  <span className="text-l2-green">SIM</span>
                ) : (
                  <span className="text-l2-red">NÃO</span>
                )
              }
            />
          </dl>
        )}
      </section>

      <ServerControls
        currentOffset={offsetOverride}
        bridgeRaw={status?.playersRaw ?? null}
      />
    </>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/45">
        {label}
      </dt>
      <dd className="mt-1 font-display text-xl font-bold">{value}</dd>
    </div>
  );
}
