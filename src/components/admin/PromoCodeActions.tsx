"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export function PromoCodeActions({ codeId }: { codeId: number }) {
  const router = useRouter();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  async function deactivate() {
    if (!confirm("Desativar esse código? Não poderá mais ser resgatado.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/promo-codes/${codeId}/deactivate`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        show(data.error ?? "Falha", "error");
        return;
      }
      show("Código desativado", "success");
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={deactivate}
      disabled={busy}
      className="rounded border border-l2-red/40 px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-l2-red transition hover:bg-l2-red/10 disabled:opacity-50"
    >
      Desativar
    </button>
  );
}
