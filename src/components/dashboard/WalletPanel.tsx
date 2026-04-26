"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

const PRESET_VALUES = [5, 10, 25, 50, 100] as const;
const MIN_AMOUNT = 5;
const COIN_RATE = 1;

type Tx = {
  id: number;
  amount: number;
  coins: number;
  status: string;
  type: string;
  description: string | null;
  createdAt: string;
  cancellable?: boolean;
};

export function WalletPanel({
  coins,
  transactions,
}: {
  coins: number;
  transactions: Tx[];
}) {
  const router = useRouter();
  const { show } = useToast();
  const searchParams = useSearchParams();
  const [amount, setAmount] = useState<string>("10");
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);

  async function cancelTx(txId: number) {
    if (
      !confirm(
        "Cancelar essa transação pendente? Você não foi até o checkout do MP.",
      )
    )
      return;
    setCancelling(txId);
    try {
      const res = await fetch(`/api/wallet/transactions/${txId}/cancel`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        show(data.error ?? "Falha ao cancelar", "error");
        return;
      }
      show("Transação cancelada", "success");
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setCancelling(null);
    }
  }

  // Toast quando voltar do MP
  useEffect(() => {
    const status = searchParams.get("status");
    if (!status) return;
    if (status === "success") {
      show("Pagamento aprovado! Coins creditados.", "success");
    } else if (status === "pending") {
      show(
        "Pagamento pendente — coins serão creditados quando o MP confirmar.",
        "info",
      );
    } else if (status === "failure") {
      show("Pagamento não aprovado.", "error");
    }
    // Limpa o ?status= da URL
    router.replace("/wallet");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const amountNum = Number(amount);
  const validAmount = Number.isFinite(amountNum) && amountNum >= MIN_AMOUNT;
  const previewCoins = validAmount ? Math.floor(amountNum / COIN_RATE) : 0;

  async function pay(e?: FormEvent) {
    e?.preventDefault();
    if (!validAmount) {
      show(`Valor mínimo R$ ${MIN_AMOUNT}`, "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/wallet/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNum }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        initPoint?: string;
      };
      if (!res.ok || !data.initPoint) {
        show(data.error ?? "Falha ao criar pagamento", "error");
        return;
      }
      window.location.href = data.initPoint;
    } catch {
      show("Erro de rede", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Saldo */}
      <section className="mb-8 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <div className="font-display text-xs font-semibold uppercase tracking-wider text-white/55">
          Saldo atual
        </div>
        <div className="mt-2 flex items-end gap-2">
          <span className="font-display text-5xl font-bold text-l2-gold">
            {coins}
          </span>
          <span className="mb-1 text-2xl">🪙</span>
        </div>
        <div className="mt-1 text-xs text-white/45">
          {coins === 1 ? "crédito" : "créditos"} do painel L2 Impure
        </div>
      </section>

      {/* Recarga */}
      <section className="mb-8 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <h3 className="mb-1 font-display text-sm font-semibold uppercase tracking-wider text-white">
          Recarregar
        </h3>
        <p className="mb-5 text-xs text-white/55">
          1 coin = R$ 1. Pagamento via Mercado Pago (PIX, cartão ou boleto).
        </p>

        <form onSubmit={pay} className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {PRESET_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className={`rounded-md border px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition ${
                  Number(amount) === v
                    ? "border-l2-gold bg-l2-gold/10 text-l2-gold"
                    : "border-white/10 text-white/75 hover:border-white/20 hover:text-white"
                }`}
              >
                R$ {v}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/55">
                Ou valor customizado (mín R${MIN_AMOUNT})
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={MIN_AMOUNT}
                step="1"
                className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 text-sm text-white focus:border-l2-gold focus:outline-none"
              />
            </div>
            <div className="flex items-baseline gap-2 px-1 text-sm">
              <span className="text-white/55">você recebe:</span>
              <strong className="font-display text-2xl text-l2-gold">
                {previewCoins}
              </strong>
              <span className="text-white/55">🪙</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || !validAmount}
            className="rounded-md px-5 py-3 font-display text-sm font-bold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "var(--l2-gold-gradient)" }}
          >
            {busy ? "Criando pagamento..." : "Pagar com Mercado Pago"}
          </button>
          <p className="text-[10px] text-white/45">
            Você será redirecionado pro checkout do Mercado Pago. Após
            confirmar, volta aqui automaticamente e os coins aparecem em
            até 1-2 minutos.
          </p>
        </form>
      </section>

      {/* Transferir (placeholder) */}
      <section className="mb-8 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-white">
          Transferir pra conta de jogo
        </h3>
        <p className="text-xs text-white/55">
          Trocar coins do painel por adena ou items in-game — em breve.
        </p>
      </section>

      {/* Histórico */}
      <section className="overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <div className="border-b border-white/5 px-6 py-4">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            Histórico
          </h3>
        </div>
        {transactions.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-white/55">
            Nenhuma transação ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left">Data</th>
                  <th className="px-6 py-3 text-left">Descrição</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                  <th className="px-6 py-3 text-right">Coins</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="px-6 py-3 text-xs text-white/55">
                      {new Date(t.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-6 py-3 text-white/85">
                      {t.description ?? t.type}
                    </td>
                    <td className="px-6 py-3 text-right font-mono tabular-nums text-white/75">
                      R$ {t.amount.toFixed(2).replace(".", ",")}
                    </td>
                    <td className="px-6 py-3 text-right font-display font-bold tabular-nums text-l2-gold">
                      {t.coins > 0 ? "+" : ""}
                      {t.coins}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-6 py-3 text-right">
                      {t.cancellable && (
                        <button
                          type="button"
                          onClick={() => cancelTx(t.id)}
                          disabled={cancelling === t.id}
                          className="rounded border border-white/10 px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-white/65 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
                        >
                          {cancelling === t.id ? "..." : "Cancelar"}
                        </button>
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

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-l2-green">
        <span className="h-1.5 w-1.5 rounded-full bg-l2-green" />
        Aprovado
      </span>
    );
  }
  if (status === "pending" || status === "in_process") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-l2-gold">
        <span className="h-1.5 w-1.5 rounded-full bg-l2-gold" />
        Pendente
      </span>
    );
  }
  if (status === "refunded") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-white/55">
        <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
        Reembolsado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-l2-red">
      <span className="h-1.5 w-1.5 rounded-full bg-l2-red" />
      {status === "rejected" ? "Recusado" : status === "cancelled" ? "Cancelado" : status}
    </span>
  );
}
