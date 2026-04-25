import { prisma } from "@/lib/db";
import { CreatePromoCodeForm } from "@/components/admin/CreatePromoCodeForm";
import { PromoCodeActions } from "@/components/admin/PromoCodeActions";

export default async function AdminPromoCodesPage() {
  const codes = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      reward: true,
      maxUses: true,
      uses: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const recentRedemptions = await prisma.promoRedemption.findMany({
    orderBy: { redeemedAt: "desc" },
    take: 50,
    select: {
      id: true,
      redeemedAt: true,
      userId: true,
      promoCode: { select: { code: true } },
    },
  });

  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Códigos promocionais
      </h1>

      <section className="mb-8 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-white">
          Criar código novo
        </h2>
        <CreatePromoCodeForm />
      </section>

      <section className="mb-8 overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <div className="border-b border-white/5 px-6 py-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            Códigos existentes
          </h2>
        </div>
        {codes.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/55">
            Nenhum código criado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left">Código</th>
                  <th className="px-6 py-3 text-left">Recompensa</th>
                  <th className="px-6 py-3 text-left">Usos</th>
                  <th className="px-6 py-3 text-left">Expira</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const expired = c.expiresAt && c.expiresAt.getTime() < Date.now();
                  const exhausted = c.maxUses !== null && c.uses >= c.maxUses;
                  const inactive = expired || exhausted;
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="px-6 py-3 font-mono font-bold uppercase text-l2-gold">
                        {c.code}
                      </td>
                      <td className="px-6 py-3 text-xs text-white/65">
                        <code className="rounded bg-black/30 px-2 py-0.5">
                          {JSON.stringify(c.reward)}
                        </code>
                      </td>
                      <td className="px-6 py-3 text-xs tabular-nums text-white/75">
                        {c.uses}/{c.maxUses ?? "∞"}
                      </td>
                      <td className="px-6 py-3 text-xs text-white/55">
                        {c.expiresAt
                          ? new Date(c.expiresAt).toLocaleString("pt-BR")
                          : <span className="text-white/30">—</span>}
                      </td>
                      <td className="px-6 py-3 text-xs">
                        {inactive ? (
                          <span className="text-white/45">
                            {expired ? "Expirado" : "Esgotado"}
                          </span>
                        ) : (
                          <span className="text-l2-green">Ativo</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {!inactive && <PromoCodeActions codeId={c.id} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <div className="border-b border-white/5 px-6 py-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            Histórico de resgates
          </h2>
        </div>
        {recentRedemptions.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/55">
            Sem resgates ainda.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
              <tr className="border-b border-white/5">
                <th className="px-6 py-3 text-left">Quando</th>
                <th className="px-6 py-3 text-left">Código</th>
                <th className="px-6 py-3 text-left">User ID</th>
              </tr>
            </thead>
            <tbody>
              {recentRedemptions.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="px-6 py-3 text-xs text-white/65">
                    {new Date(r.redeemedAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-l2-gold">
                    {r.promoCode.code}
                  </td>
                  <td className="px-6 py-3 text-xs text-white/55">#{r.userId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
