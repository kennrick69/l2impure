"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export function AnnouncementActions({
  id,
  archived,
}: {
  id: number;
  archived: boolean;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  async function call(
    method: "PATCH" | "DELETE",
    body?: unknown,
  ): Promise<boolean> {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        show(data.error ?? "Falha", "error");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      show("Erro de rede", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive() {
    const ok = await call("PATCH", { archived: !archived });
    if (ok) show(archived ? "Despublicado" : "Arquivado", "success");
  }

  async function remove() {
    if (!confirm("Excluir esse anúncio? Ação irreversível.")) return;
    const ok = await call("DELETE");
    if (ok) show("Anúncio removido", "success");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={toggleArchive}
        disabled={busy}
        className="rounded border border-white/10 px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-white/75 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
      >
        {archived ? "Reativar" : "Arquivar"}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="rounded border border-l2-red/40 px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-l2-red transition hover:bg-l2-red/10 disabled:opacity-50"
      >
        Excluir
      </button>
    </div>
  );
}
