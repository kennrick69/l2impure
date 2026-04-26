"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { useItemsMetadata, getItemFromCache } from "@/lib/use-items-metadata";
import { ItemPickerModal } from "@/components/admin/ItemPickerModal";
import { ItemIcon } from "@/components/admin/ItemIcon";
import type {
  AdminGmItemOwner,
  AdminGmItemOwnersResponse,
  ItemMetadata,
} from "@/lib/bridge";

const PAGE_SIZE = 100;

export function ItemSearchPanel() {
  // Pré-carrega metadata pra resoluções de nome
  useItemsMetadata();
  const { show } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<ItemMetadata | null>(null);
  const [manualId, setManualId] = useState("");
  const [data, setData] = useState<AdminGmItemOwnersResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [offset, setOffset] = useState(0);

  async function search(itemId: number, off: number = 0) {
    setSearching(true);
    setOffset(off);
    try {
      const res = await fetch(
        `/api/admin/items/owners?itemId=${itemId}&limit=${PAGE_SIZE}&offset=${off}`,
      );
      const j = (await res.json().catch(() => ({}))) as
        | AdminGmItemOwnersResponse
        | { error?: string };
      if (!res.ok || "error" in j) {
        show(("error" in j && j.error) || "Falha", "error");
        return;
      }
      setData(j as AdminGmItemOwnersResponse);
    } catch {
      show("Erro de rede", "error");
    } finally {
      setSearching(false);
    }
  }

  function searchManual() {
    const id = Number(manualId);
    if (!Number.isFinite(id) || id <= 0) {
      show("ID inválido", "error");
      return;
    }
    const meta = getItemFromCache(id);
    setPicked(meta ?? null);
    void search(id, 0);
  }

  function pageQuery(o: number) {
    if (!data) return;
    void search(data.itemId, o);
  }

  return (
    <>
      <section className="mb-6 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-5">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/55">
              Item (catálogo)
            </label>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 text-left text-sm text-white transition hover:border-l2-gold"
            >
              {picked ? (
                <span className="flex items-center gap-2">
                  <ItemIcon itemId={picked.id} item={picked} size={28} />
                  <span className="flex-1">
                    <span className="font-display font-semibold">
                      {picked.name}
                    </span>
                    <span className="ml-2 font-mono text-[10px] text-white/45">
                      #{picked.id} · {picked.grade === "NONE" ? "no-grade" : picked.grade}
                    </span>
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-white/45">
                    trocar →
                  </span>
                </span>
              ) : (
                <span className="text-white/55">
                  📋 Clique pra abrir o catálogo…
                </span>
              )}
            </button>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/55">
              ou ID direto
            </label>
            <input
              type="number"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="ex: 6660"
              className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 text-sm text-white focus:border-l2-gold focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                picked ? void search(picked.id, 0) : searchManual()
              }
              disabled={searching || (!picked && !manualId)}
              className="rounded-md px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: "var(--l2-gold-gradient)" }}
            >
              {searching ? "Buscando..." : "Buscar owners"}
            </button>
          </div>
        </div>
      </section>

      {data && <OwnersTable data={data} onPage={pageQuery} />}

      <ItemPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(it) => {
          setPicked(it);
          setManualId(String(it.id));
          void search(it.id, 0);
        }}
      />
    </>
  );
}

function OwnersTable({
  data,
  onPage,
}: {
  data: AdminGmItemOwnersResponse;
  onPage: (offset: number) => void;
}) {
  const { owners, total, itemId, limit, offset } = data;
  const pageStart = offset + 1;
  const pageEnd = Math.min(offset + limit, total);
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  return (
    <section className="overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
      <div className="flex items-center justify-between border-b border-white/5 px-6 py-3">
        <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/45">
          {total > 0 ? `${pageStart}-${pageEnd} de ${total}` : "Nenhum owner"} ·
          item #{itemId}
        </span>
        <div className="flex gap-2">
          {hasPrev && (
            <button
              type="button"
              onClick={() => onPage(Math.max(0, offset - limit))}
              className="rounded border border-white/10 px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-white/75 transition hover:bg-white/5 hover:text-white"
            >
              ← Anterior
            </button>
          )}
          {hasNext && (
            <button
              type="button"
              onClick={() => onPage(offset + limit)}
              className="rounded border border-white/10 px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-white/75 transition hover:bg-white/5 hover:text-white"
            >
              Próxima →
            </button>
          )}
        </div>
      </div>
      {owners.length === 0 ? (
        <div className="p-8 text-center text-sm text-white/55">
          Nenhum personagem possui esse item.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
              <tr className="border-b border-white/5">
                <th className="px-6 py-3 text-left">Personagem</th>
                <th className="px-6 py-3 text-left">Conta</th>
                <th className="px-6 py-3 text-left">Lv</th>
                <th className="px-6 py-3 text-right">Qtd</th>
                <th className="px-6 py-3 text-right">+Enchant</th>
                <th className="px-6 py-3 text-left">Loc</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((o: AdminGmItemOwner) => (
                <tr
                  key={o.objectId}
                  className="border-b border-white/5 last:border-0 hover:bg-white/3"
                >
                  <td className="px-6 py-3">
                    <Link
                      href={`/admin/characters/${o.charId}`}
                      className="font-display font-semibold text-white transition hover:text-l2-gold"
                    >
                      {o.charName}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-xs text-white/55">
                    {o.account}
                  </td>
                  <td className="px-6 py-3 font-display font-bold text-l2-gold">
                    {o.level}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-white/85">
                    {o.count.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-white/85">
                    {o.enchantLevel > 0 ? `+${o.enchantLevel}` : "—"}
                  </td>
                  <td className="px-6 py-3 text-xs text-white/55">{o.loc}</td>
                  <td className="px-6 py-3 text-xs">
                    {o.online ? (
                      <span className="text-l2-green">Online</span>
                    ) : (
                      <span className="text-white/45">Offline</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
