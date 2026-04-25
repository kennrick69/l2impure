import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/dashboard/Placeholder";
import { CreateAccountTrigger } from "@/components/dashboard/CreateAccountTrigger";

export default async function WarehousePage() {
  const session = await getSession();
  if (!session) return null;

  const accounts = await prisma.gameAccount.findMany({
    where: { userId: session.sub },
    select: { id: true, gameLogin: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <PageTitle
        title="Meu depósito"
        subtitle="Itens guardados das suas contas de jogo."
      />

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-12 text-center">
          <div className="mb-4 text-5xl opacity-40">📦</div>
          <h2 className="mb-2 font-display text-lg font-bold uppercase tracking-wider text-white">
            Você ainda não tem contas de jogo
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-white/55">
            Crie sua primeira conta pra ter um depósito.
          </p>
          <CreateAccountTrigger variant="outline">
            <span>➕</span>
            <span>Criar conta de jogo</span>
          </CreateAccountTrigger>
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-5">
            <label
              htmlFor="warehouse-account"
              className="mb-2 block font-display text-[10px] font-semibold uppercase tracking-[1.5px] text-white/55"
            >
              Conta de jogo
            </label>
            <select
              id="warehouse-account"
              defaultValue={accounts[0]?.gameLogin}
              disabled
              title="Em breve — sincronização com servidor de jogo"
              className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 text-sm text-white/85 disabled:cursor-not-allowed"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.gameLogin}>
                  ⚔️ {a.gameLogin}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[10px] text-white/45">
              O seletor fica ativo quando o sync com o servidor de jogo
              começar a popular itens.
            </p>
          </section>

          <section className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-12 text-center">
            <div className="mb-4 text-5xl opacity-40">📦</div>
            <h2 className="mb-2 font-display text-lg font-bold uppercase tracking-wider text-white">
              Sem itens armazenados
            </h2>
            <p className="mx-auto max-w-md text-sm text-white/55">
              Quando você guardar itens no depósito do jogo, eles aparecem
              aqui. Em breve dá pra movimentar entre contas direto pelo
              painel.
            </p>
          </section>
        </>
      )}
    </>
  );
}
