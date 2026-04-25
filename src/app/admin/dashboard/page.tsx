import { prisma } from "@/lib/db";
import { bridge } from "@/lib/bridge";

export default async function AdminDashboardPage() {
  const [
    totalUsers,
    verifiedUsers,
    totalGameAccounts,
    totalReferrals,
    convertedReferrals,
    last30,
    recentSignups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isVerified: true } }),
    prisma.gameAccount.count(),
    prisma.referral.count(),
    prisma.referral.count({ where: { status: "converted" } }),
    prisma.user.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { createdAt: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, email: true, isVerified: true, createdAt: true },
    }),
  ]);

  let onlinePlayers = 0;
  let serverOnline = false;
  try {
    const s = await bridge.status();
    onlinePlayers = s.players;
    serverOnline = s.online;
  } catch {
    // bridge fora — mostra 0/offline
  }

  // Bucket signups por dia (últimos 30)
  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: 0 });
  }
  for (const u of last30) {
    const key = u.createdAt.toISOString().slice(0, 10);
    const bucket = days.find((d) => d.date === key);
    if (bucket) bucket.count++;
  }
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Dashboard admin
      </h1>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Usuários" value={totalUsers} hint={`${verifiedUsers} verificados`} />
        <Stat label="Contas de jogo" value={totalGameAccounts} />
        <Stat
          label="Indicações"
          value={totalReferrals}
          hint={`${convertedReferrals} convertidas`}
        />
        <Stat
          label="Online agora"
          value={onlinePlayers}
          hint={serverOnline ? "Servidor online" : "Servidor offline"}
          accent={serverOnline ? "green" : "red"}
        />
      </section>

      <section className="mb-8 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-white">
          Registros últimos 30 dias
        </h2>
        <div className="flex h-32 items-end gap-1">
          {days.map((d) => (
            <div
              key={d.date}
              className="group relative flex flex-1 flex-col items-center"
            >
              <div
                className="w-full rounded-t bg-l2-gold/40 transition group-hover:bg-l2-gold"
                style={{
                  height: `${(d.count / maxCount) * 100}%`,
                  minHeight: d.count > 0 ? "3px" : "0",
                }}
                title={`${d.date}: ${d.count} cadastro${d.count === 1 ? "" : "s"}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-white/45">
          <span>{days[0].date}</span>
          <span>hoje</span>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <div className="border-b border-white/5 px-6 py-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            Últimos cadastros
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
            <tr className="border-b border-white/5">
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Verificado</th>
              <th className="px-6 py-3 text-left">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {recentSignups.map((u) => (
              <tr
                key={u.id}
                className="border-b border-white/5 last:border-0"
              >
                <td className="px-6 py-3 text-white/85">{u.email}</td>
                <td className="px-6 py-3 text-xs">
                  {u.isVerified ? (
                    <span className="text-l2-green">Sim</span>
                  ) : (
                    <span className="text-white/45">Não</span>
                  )}
                </td>
                <td className="px-6 py-3 text-xs text-white/55">
                  {new Date(u.createdAt).toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: "green" | "red";
}) {
  const valueColor =
    accent === "green"
      ? "text-l2-green"
      : accent === "red"
        ? "text-l2-red"
        : "text-l2-gold";
  return (
    <div className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-5">
      <div className="font-display text-xs font-semibold uppercase tracking-wider text-white/55">
        {label}
      </div>
      <div className={`mt-2 font-display text-3xl font-bold ${valueColor}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-white/55">{hint}</div>}
    </div>
  );
}
