"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import {
  CoinsIcon,
  CreditCardIcon,
  AlertTriangleIcon,
  SendIcon,
} from "@/components/icons";

// Preço: 1 TOL = R$ 1,50. Presets casam com os tiers de bônus.
const PRESET_TOL = [50, 100, 150, 200, 300] as const;
const MIN_TOL = 10;
const MAX_TOL = 3000;
const COIN_RATE = 1.5; // R$ por TOL
// Bônus aplicado ao ENVIAR TOL do painel pro jogo (não na compra).
const BONUS_TIERS = [
  { from: 50, bonus: 15 },
  { from: 100, bonus: 20 },
  { from: 150, bonus: 25 },
  { from: 200, bonus: 30 },
  { from: 300, bonus: 40 },
] as const;

/** % de bônus NA COMPRA de `tol` TOL (o extra cai no painel). */
function bonusPct(tol: number): number {
  for (let i = BONUS_TIERS.length - 1; i >= 0; i--) {
    if (tol >= BONUS_TIERS[i].from) return BONUS_TIERS[i].bonus;
  }
  return 0;
}

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
  const [amount, setAmount] = useState<string>("50");
  const [sendChar, setSendChar] = useState<string>("");
  const [sendTol, setSendTol] = useState<string>("");
  const [sendBusy, setSendBusy] = useState(false);
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

  const tolNum = Math.max(0, Math.floor(Number(amount) || 0));
  const validAmount = tolNum >= MIN_TOL && tolNum <= MAX_TOL;
  const priceBRL = tolNum * COIN_RATE;

  async function pay(e?: FormEvent) {
    e?.preventDefault();
    if (!validAmount) {
      show(`Quantidade mínima: ${MIN_TOL} TOL`, "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/wallet/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: priceBRL }),
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

  async function sendToGame(e?: FormEvent) {
    e?.preventDefault();
    const n = Math.floor(Number(sendTol) || 0);
    const char = sendChar.trim();
    if (!char) {
      show("Informe o personagem", "error");
      return;
    }
    if (n < 1) {
      show("Quantidade de TOL inválida", "error");
      return;
    }
    if (n > coins) {
      show("Saldo de TOL insuficiente", "error");
      return;
    }
    setSendBusy(true);
    try {
      const res = await fetch("/api/wallet/send-to-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ charName: char, tol: n }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        delivered?: number;
      };
      if (!res.ok) {
        show(data.error ?? "Falha ao enviar", "error");
        return;
      }
      show(`Enviado! ${data.delivered} TOL a caminho de ${char}`, "success");
      setSendTol("");
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setSendBusy(false);
    }
  }

  // Bônus da COMPRA (preview): base selecionada + bônus = TOL no painel.
  const buyBonus = bonusPct(tolNum);
  const buyTotal = Math.floor(tolNum * (1 + buyBonus / 100));

  return (
    <>
      {/* Saldo + formulário de envio lado a lado */}
      <section className="l2-panel mb-8 grid gap-6 p-6 lg:grid-cols-2">
        {/* Saldo */}
        <div className="lg:border-r lg:border-white/5 lg:pr-6">
          <div className="font-display text-xs font-semibold uppercase tracking-wider text-white/55">
            Saldo atual
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-display text-5xl font-bold text-l2-gold">
              {coins}
            </span>
            <CoinsIcon className="mb-1.5 h-8 w-8 text-l2-gold" />
          </div>
          <div className="mt-1 text-xs text-white/45">
            TOL no painel — disponível para enviar a um personagem
          </div>
        </div>

        {/* Enviar TOL ao jogo */}
        <div>
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-white">
            <SendIcon className="h-4 w-4 text-l2-gold" />
            Enviar TOL ao jogo
          </h3>
          <p className="mb-4 mt-1 text-xs text-white/55">
            Debita do saldo e entrega no personagem (online ou offline). O
            personagem recebe exatamente o que você enviar.
          </p>
          <form onSubmit={sendToGame} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/55">
                Personagem
              </label>
              <input
                value={sendChar}
                onChange={(e) => setSendChar(e.target.value)}
                placeholder="Nome do personagem"
                className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 text-sm text-white focus:border-l2-gold focus:outline-none"
              />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/55">
                  TOL (saldo {coins})
                </label>
                <input
                  type="number"
                  min={1}
                  max={coins}
                  step="1"
                  value={sendTol}
                  onChange={(e) => setSendTol(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 text-sm text-white focus:border-l2-gold focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={sendBusy}
                className="rounded-md border border-l2-gold/40 px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-l2-gold transition hover:bg-l2-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sendBusy ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Top up — layout fiel ao L2MAD */}
      <section className="mb-8 overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <div className="flex items-center gap-2 border-b border-white/5 px-6 py-4">
          <CoinsIcon className="h-5 w-5 text-l2-gold" />
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            Recarregar saldo do servidor:{" "}
            <span className="text-l2-gold">L2 Impure</span>
          </h3>
        </div>

        <form onSubmit={pay} className="grid gap-6 p-6 lg:grid-cols-2">
          {/* Forma de pagamento */}
          <div>
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/45">
              Forma de pagamento
            </div>
            <div className="flex items-center gap-3 rounded-lg border-2 border-l2-gold bg-l2-gold/10 px-4 py-4">
              <CreditCardIcon className="h-7 w-7 text-l2-gold" />
              <div>
                <div className="font-display text-sm font-semibold text-white">
                  Mercado Pago
                </div>
                <div className="text-[11px] text-white/55">
                  PIX, cartão ou boleto
                </div>
              </div>
            </div>
          </div>

          {/* Bônus */}
          <div>
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/45">
              Bônus na compra
            </div>
            <div className="overflow-hidden rounded-lg border border-white/5">
              {BONUS_TIERS.map((t, i) => (
                <div
                  key={t.from}
                  className={`flex items-center justify-between px-4 py-2.5 text-xs ${
                    i % 2 === 0 ? "bg-black/20" : ""
                  }`}
                >
                  <span className="text-white/55">
                    A partir de{" "}
                    <span className="font-semibold text-l2-gold">
                      {t.from} TOL
                    </span>
                  </span>
                  <span className="font-display font-bold text-l2-green">
                    +{t.bonus}%
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[10px] text-white/40">
              <AlertTriangleIcon className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>
                O bônus é aplicado na compra — o TOL extra já entra no seu
                painel. O envio ao personagem é 1:1.
              </span>
            </p>
          </div>

          {/* Quantidade + slider */}
          <div className="lg:col-span-2">
            <div className="mb-2 flex items-end justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Quantidade de TOL
              </label>
              <span className="text-xs text-white/55">
                Você paga{" "}
                <strong className="font-display text-base text-l2-gold">
                  R$ {priceBRL.toFixed(2).replace(".", ",")}
                </strong>
                {buyBonus > 0 && (
                  <span className="text-l2-green">
                    {" "}
                    → recebe <strong>{buyTotal} TOL</strong>
                  </span>
                )}
              </span>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {PRESET_TOL.map((v) => (
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
                  {v} TOL
                </button>
              ))}
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={MIN_TOL}
              max={MAX_TOL}
              step="1"
              className="mb-3 w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 text-sm text-white focus:border-l2-gold focus:outline-none"
            />
            <input
              type="range"
              min={MIN_TOL}
              max={MAX_TOL}
              step="1"
              value={Math.min(MAX_TOL, Math.max(MIN_TOL, tolNum))}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full accent-[color:var(--l2-gold)]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-white/35">
              <span>{MIN_TOL} TOL</span>
              <span>{MAX_TOL} TOL</span>
            </div>
          </div>

          {/* Botão */}
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={busy || !validAmount}
              className="w-full rounded-md px-5 py-3 font-display text-sm font-bold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: "var(--l2-gold-gradient)" }}
            >
              {busy ? "Criando pagamento..." : "Recarregar"}
            </button>
          </div>
          <p className="text-[10px] text-white/45 lg:col-span-2">
            1 TOL = R$ 1,50. Você será redirecionado pro checkout do Mercado
            Pago; após confirmar, o saldo aparece em 1-2 minutos.
          </p>
        </form>
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
