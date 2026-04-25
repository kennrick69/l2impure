import { getSession } from "@/lib/auth";
import { referralUrl, referralCodeFor } from "@/lib/referral";
import { PageTitle } from "@/components/dashboard/Placeholder";
import { ReferralLinkCopy } from "@/components/dashboard/ReferralLinkCopy";

export default async function ReferralsPage() {
  const session = await getSession();
  if (!session) return null;

  const code = referralCodeFor(session.sub);
  const url = referralUrl(session.sub);

  return (
    <>
      <PageTitle
        title="Indicações"
        subtitle="Convide amigos pra L2 Impure e ganhe recompensas quando jogarem."
      />

      <section className="mb-8 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <h3 className="mb-1 font-display text-sm font-semibold uppercase tracking-wider text-white">
          Seu link de indicação
        </h3>
        <p className="mb-4 text-xs text-white/55">
          Compartilhe esse link. Quem se registrar por ele entra na sua
          rede de indicações.
        </p>
        <ReferralLinkCopy url={url} code={code} />
      </section>

      <section className="overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <div className="border-b border-white/5 px-6 py-4">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            Suas indicações
          </h3>
        </div>
        <div className="px-6 py-12 text-center">
          <div className="mb-3 text-4xl opacity-30">👥</div>
          <p className="mb-1 text-sm text-white/65">
            Nenhuma indicação ainda
          </p>
          <p className="text-xs text-white/45">
            Quando alguém se cadastrar com o seu link, vai aparecer aqui.
          </p>
        </div>
      </section>
    </>
  );
}
