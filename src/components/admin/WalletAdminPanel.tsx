"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

type AdminTx = {
  id: number;
  userId: number;
  userEmail: string;
  amount: number;
  coins: number;
  status: string;
  type: string;
  description: string | null;
  mpPaymentId: string | null;
  createdAt: string;
};

const STATUS_FILTERS = [
  { v: "", label: "Todos" },
  { v: "approved", label: "Aprovados" },
  { v: "pending", label: "Pendentes" },
  { v: "rejected", label: "Recusados" },
  { v: "refunded", label: "Reembolsados" },
];

export function WalletAdminPanel({ transactions }: { transactions: AdminTx[] }) {
  const router = useRouter();
  const { show } = useToast();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCreditForm, setShowCreditForm] = useState(false);

  const filtered = transactions.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !t.userEmail.toLowerCase().includes(q) &&
        !String(t.id).includes(q) &&
        !(t.mpPaymentId ?? "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  async function refund(t: AdminTx) {
    if (!t.mpPaymentId) {
      show("Sem mpPaymentId — não dá pra reembolsar via MP", "error");
      return;
    }
    if (
      !confirm(
        `Reembolsar R$ ${t.amount.toFixed(2)} via MP e debitar ${t.coins} coins de ${t.userEmail}?`,
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/wallet/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: t.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        show(data.error ?? "Falha", "error");
        return;
      }
      show("Reembolso processado", "success");
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="mb-4 flex flex-col gap-3 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-4 sm:flex-row sm:items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.v} value={f.v}>
              {f.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email, ID, payment id…"
          className="flex-1 rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          onClick={() => setShowCreditForm((s) => !s)}
          className="rounded-md border border-l2-gold/40 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-l2-gold transition hover:bg-l2-gold/10"
        >
          {showCreditForm ? "Fechar" : "💰 Creditar manual"}
        </button>
      </section>

      {showCreditForm && <CreditForm onClose={() => setShowCreditForm(false)} />}

      <section className="overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <div className="border-b border-white/5 px-6 py-3">
          <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/45">
            {filtered.length} de {transactions.length} transações
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/55">
            Nenhuma transação no filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-left">Usuário</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-right">R$</th>
                  <th className="px-4 py-2 text-right">Coins</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">MP Payment</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2 font-mono text-[11px] text-white/55">
                      #{t.id}
                    </td>
                    <td className="px-4 py-2 text-xs text-white/55">
                      {new Date(t.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-2 text-xs text-white/85">
                      {t.userEmail}
                    </td>
                    <td className="px-4 py-2 text-xs text-white/65">{t.type}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-white/85">
                      {t.amount.toFixed(2).replace(".", ",")}
                    </td>
                    <td className="px-4 py-2 text-right font-display font-bold tabular-nums text-l2-gold">
                      {t.coins > 0 ? "+" : ""}
                      {t.coins}
                    </td>
                    <td className="px-4 py-2 text-xs">{t.status}</td>
                    <td className="px-4 py-2 font-mono text-[10px] text-white/45">
                      {t.mpPaymentId ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {t.status === "approved" && t.type === "recharge" && t.mpPaymentId ? (
                        <button
                          type="button"
                          onClick={() => refund(t)}
                          disabled={busy}
                          className="rounded border border-l2-red/40 px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-l2-red hover:bg-l2-red/10 disabled:opacity-40"
                        >
                          Reembolsar
                        </button>
                      ) : null}
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

function CreditForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { show } = useToast();
  const [email, setEmail] = useState("");
  const [coins, setCoins] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const c = Number(coins);
    if (!email || !Number.isFinite(c) || c === 0) {
      show("Email + coins (não-zero) obrigatórios", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/wallet/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, coins: c, reason }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        show(data.error ?? "Falha", "error");
        return;
      }
      show(`${c > 0 ? "Creditado" : "Debitado"}: ${c} coins pra ${email}`, "success");
      setEmail("");
      setCoins("");
      setReason("");
      onClose();
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-4 rounded-xl border border-l2-gold/40 bg-l2-gold/5 p-5">
      <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-l2-gold">
        Creditar coins manualmente
      </h3>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end">
        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/55">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/55">
          Coins (negativo debita)
          <input
            type="number"
            value={coins}
            onChange={(e) => setCoins(e.target.value)}
            required
            className="rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/55">
          Motivo (opcional)
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="ex: ajuste, prêmio evento, refund manual"
            className="rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md px-5 py-2 font-display text-xs font-bold uppercase tracking-wider text-black disabled:opacity-50"
          style={{ background: "var(--l2-gold-gradient)" }}
        >
          {busy ? "..." : "Aplicar"}
        </button>
      </form>
    </section>
  );
}
