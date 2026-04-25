import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  REFERRAL_REWARD_REFERRED,
  REFERRAL_REWARD_REFERRER,
  REFERRAL_TARGET_LEVEL,
  referralUrl,
} from "@/lib/referral";
import { checkAndConvertReferral } from "@/lib/referral-conversion";
import { PageTitle } from "@/components/dashboard/Placeholder";
import { ReferralLinkCopy } from "@/components/dashboard/ReferralLinkCopy";

type EnrichedReferral = {
  id: number;
  status: "pending" | "converted";
  referredEmail: string;
  createdAt: Date;
  convertedAt: Date | null;
  maxLevel: number;
};

export default async function ReferralsPage() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, referralCode: true, coins: true },
  });
  if (!user) return null;

  const referrals = await prisma.referral.findMany({
    where: { referrerId: user.id },
    select: {
      id: true,
      status: true,
      createdAt: true,
      convertedAt: true,
      referred: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Roda conversão pra cada pendente — dispara em paralelo, tolerante
  const enriched: EnrichedReferral[] = await Promise.all(
    referrals.map(async (r) => {
      let maxLevel = 0;
      let status = r.status;
      let convertedAt = r.convertedAt;
      if (r.status === "pending") {
        try {
          const result = await checkAndConvertReferral(r.id);
          maxLevel = result.maxLevel;
          if (result.status === "converted") {
            status = "converted";
            convertedAt = new Date();
          }
        } catch (e) {
          console.warn(
            "[/referrals] conversion check falhou:",
            (e as Error).message,
          );
        }
      } else {
        maxLevel = REFERRAL_TARGET_LEVEL;
      }
      return {
        id: r.id,
        status,
        referredEmail: r.referred.email,
        createdAt: r.createdAt,
        convertedAt,
        maxLevel,
      };
    }),
  );

  const url = referralUrl(user.referralCode);

  return (
    <>
      <PageTitle
        title="Indicações"
        subtitle={`Indique amigos. Quando atingirem level ${REFERRAL_TARGET_LEVEL}, vocês dois ganham coins! Você: ${REFERRAL_REWARD_REFERRER} coins | Seu amigo: ${REFERRAL_REWARD_REFERRED} coins.`}
      />

      <section className="mb-8 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <h3 className="mb-1 font-display text-sm font-semibold uppercase tracking-wider text-white">
          Seu link de indicação
        </h3>
        <p className="mb-4 text-xs text-white/55">
          Compartilhe esse link. Quem se registrar por ele entra na sua
          rede de indicações.
        </p>
        <ReferralLinkCopy url={url} code={user.referralCode} />
      </section>

      <section className="overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            Suas indicações
          </h3>
          <span className="text-xs text-white/55">
            Total:{" "}
            <strong className="font-display text-white">
              {enriched.length}
            </strong>
          </span>
        </div>

        {enriched.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mb-3 text-4xl opacity-30">👥</div>
            <p className="mb-1 text-sm text-white/65">
              Nenhuma indicação ainda
            </p>
            <p className="text-xs text-white/45">
              Quando alguém se cadastrar com o seu link, vai aparecer aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left">Indicado</th>
                  <th className="px-6 py-3 text-left">Inscrito em</th>
                  <th className="px-6 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {enriched.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/3"
                  >
                    <td className="px-6 py-3 text-white/85">
                      {r.referredEmail}
                    </td>
                    <td className="px-6 py-3 text-xs text-white/55">
                      {new Date(r.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-6 py-3">
                      {r.status === "converted" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-l2-green">
                          <span className="h-1.5 w-1.5 rounded-full bg-l2-green" />
                          Convertido +{REFERRAL_REWARD_REFERRER} coins
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-white/55">
                          <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                          Pendente (level {r.maxLevel}/
                          {REFERRAL_TARGET_LEVEL})
                        </span>
                      )}
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
