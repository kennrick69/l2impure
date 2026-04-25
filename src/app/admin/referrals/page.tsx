import { prisma } from "@/lib/db";
import { getSetting, SETTINGS } from "@/lib/settings";
import {
  REFERRAL_REWARD_REFERRED,
  REFERRAL_REWARD_REFERRER,
} from "@/lib/referral";
import { ReferralAdminControls } from "@/components/admin/ReferralAdminControls";

export default async function AdminReferralsPage() {
  const [referrals, enabled, rewardReferrer, rewardReferred] = await Promise.all([
    prisma.referral.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        status: true,
        createdAt: true,
        convertedAt: true,
        referrer: { select: { email: true } },
        referred: { select: { email: true } },
      },
    }),
    getSetting<boolean>(SETTINGS.referralsEnabled, true),
    getSetting<number>(SETTINGS.referralRewardReferrer, REFERRAL_REWARD_REFERRER),
    getSetting<number>(SETTINGS.referralRewardReferred, REFERRAL_REWARD_REFERRED),
  ]);

  const totalConverted = referrals.filter((r) => r.status === "converted").length;

  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Indicações (admin)
      </h1>

      <ReferralAdminControls
        enabled={enabled}
        rewardReferrer={rewardReferrer}
        rewardReferred={rewardReferred}
      />

      <section className="mt-8 overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            Todas as indicações
          </h2>
          <span className="text-xs text-white/55">
            {referrals.length} total · <strong className="text-l2-green">{totalConverted}</strong> convertidas
          </span>
        </div>
        {referrals.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/55">
            Nenhuma indicação ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left">Indicador</th>
                  <th className="px-6 py-3 text-left">Indicado</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Criado</th>
                  <th className="px-6 py-3 text-left">Convertido</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="px-6 py-3 text-white/85">{r.referrer.email}</td>
                    <td className="px-6 py-3 text-white/85">{r.referred.email}</td>
                    <td className="px-6 py-3 text-xs">
                      {r.status === "converted" ? (
                        <span className="text-l2-green">Convertida</span>
                      ) : (
                        <span className="text-white/45">Pendente</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs text-white/55">
                      {new Date(r.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-6 py-3 text-xs text-white/55">
                      {r.convertedAt
                        ? new Date(r.convertedAt).toLocaleString("pt-BR")
                        : <span className="text-white/30">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
