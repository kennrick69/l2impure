"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import {
  useItemsMetadata,
  itemName,
  itemGrade,
} from "@/lib/use-items-metadata";
import { ItemPickerModal } from "@/components/admin/ItemPickerModal";
import { ItemIcon } from "@/components/admin/ItemIcon";
import type {
  AdminGmCharFull,
  AdminGmInventoryItem,
  ItemMetadata,
} from "@/lib/bridge";

type TabKey = "inventory" | "stats";

const LOCATIONS = ["INVENTORY", "PAPERDOLL", "WAREHOUSE", "FREIGHT"] as const;

export function CharacterDetailView({
  char,
  inventory,
}: {
  char: AdminGmCharFull;
  inventory: AdminGmInventoryItem[];
}) {
  // Garante que metadata esteja carregada (não precisamos do retorno)
  useItemsMetadata();
  const [tab, setTab] = useState<TabKey>("inventory");

  return (
    <>
      <CharHeader char={char} />
      <div className="my-6 flex gap-1 border-b border-white/5">
        <TabButton active={tab === "inventory"} onClick={() => setTab("inventory")}>
          Inventário ({inventory.length})
        </TabButton>
        <TabButton active={tab === "stats"} onClick={() => setTab("stats")}>
          Stats
        </TabButton>
      </div>

      {tab === "inventory" ? (
        <InventoryTab char={char} inventory={inventory} />
      ) : (
        <StatsTab char={char} />
      )}
    </>
  );
}

function CharHeader({ char }: { char: AdminGmCharFull }) {
  return (
    <div className="rounded-xl border border-l2-gold/40 bg-l2-gold/5 p-6">
      <div className="flex flex-wrap items-baseline gap-4">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
          {char.name}
        </h1>
        <span className="text-sm text-white/65">
          {char.className} · Lv{" "}
          <strong className="text-l2-gold">{char.level}</strong>
        </span>
        <span className="text-xs text-white/55">conta {char.account}</span>
        <span className="text-xs text-white/55">
          clã {char.clanName ?? "—"}
        </span>
        {char.hero && (
          <span className="rounded-full bg-l2-gold/15 px-2 py-0.5 font-display text-[9px] font-semibold uppercase tracking-wider text-l2-gold">
            hero
          </span>
        )}
        {char.nobless && (
          <span className="rounded-full bg-white/8 px-2 py-0.5 font-display text-[9px] font-semibold uppercase tracking-wider text-white/85">
            nobless
          </span>
        )}
        <span className="ml-auto text-xs">
          {char.online ? (
            <span className="text-l2-red">⚠️ ONLINE</span>
          ) : (
            <span className="text-white/45">offline</span>
          )}
        </span>
      </div>
    </div>
  );
}

function StatsTab({ char }: { char: AdminGmCharFull }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <StatBlock
        title="Combate"
        rows={[
          ["PvP kills", char.pvp],
          ["PK kills", char.pk],
          ["Karma", char.karma],
          ["Race", char.race],
          ["Sex", char.sex === 0 ? "Masculino" : "Feminino"],
        ]}
      />
      <StatBlock
        title="Status"
        rows={[
          ["EXP", char.exp.toLocaleString("pt-BR")],
          ["SP", char.sp.toLocaleString("pt-BR")],
          ["Max HP", char.maxHp],
          ["Max MP", char.maxMp],
          ["Max CP", char.maxCp],
        ]}
      />
      <StatBlock
        title="Localização atual"
        rows={[
          ["X", char.x],
          ["Y", char.y],
          ["Z", char.z],
        ]}
      />
      <StatBlock
        title="Sessão"
        rows={[
          [
            "Último acesso",
            char.lastAccess
              ? new Date(char.lastAccess).toLocaleString("pt-BR")
              : "—",
          ],
          [
            "Tempo online",
            `${Math.floor(char.onlinetime / 3600)}h ${Math.floor((char.onlinetime % 3600) / 60)}m`,
          ],
        ]}
      />
    </section>
  );
}

function StatBlock({
  title,
  rows,
}: {
  title: string;
  rows: [string, string | number][];
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-5">
      <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-white">
        {title}
      </h3>
      <dl className="flex flex-col gap-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-white/55">{k}</dt>
            <dd className="font-mono tabular-nums text-white/85">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-5 py-2.5 font-display text-xs font-semibold uppercase tracking-wider transition ${
        active ? "text-l2-gold" : "text-white/55 hover:text-white"
      }`}
    >
      {children}
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 bg-l2-gold" />
      )}
    </button>
  );
}

function InventoryTab({
  char,
  inventory,
}: {
  char: AdminGmCharFull;
  inventory: AdminGmInventoryItem[];
}) {
  const router = useRouter();
  const { show } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<ItemMetadata | null>(null);
  const [count, setCount] = useState("1");
  const [enchant, setEnchant] = useState("0");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");

  const grouped = useMemo(() => {
    const g: Record<string, AdminGmInventoryItem[]> = {};
    for (const it of inventory) {
      const f = filter.trim().toLowerCase();
      if (f) {
        const name = itemName(it.itemId).toLowerCase();
        if (!name.includes(f) && !String(it.itemId).includes(f)) continue;
      }
      const key = it.loc;
      if (!g[key]) g[key] = [];
      g[key].push(it);
    }
    return g;
  }, [inventory, filter]);

  async function call(payload: Record<string, unknown>, success: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/characters/${char.charId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (data.code === "pin_required") {
          show("Sessão GM expirada. Vá em /admin/game-master e digite o PIN.", "info");
          return false;
        }
        show(data.error ?? "Falha", "error");
        return false;
      }
      show(success, "success");
      router.refresh();
      return true;
    } catch {
      show("Erro de rede", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    if (!picked) return;
    const c = Number(count);
    const e = Number(enchant);
    if (!Number.isFinite(c) || c <= 0) {
      show("Quantidade inválida", "error");
      return;
    }
    const ok = await call(
      {
        action: "add",
        itemId: picked.id,
        count: c,
        enchantLevel: Number.isFinite(e) ? e : 0,
      },
      `Adicionado: ${picked.name} ×${c}`,
    );
    if (ok) {
      setPicked(null);
      setCount("1");
      setEnchant("0");
    }
  }

  async function removeItem(it: AdminGmInventoryItem) {
    if (
      !confirm(
        `Remover ${itemName(it.itemId)} (×${it.count}, +${it.enchantLevel}) do inventário?`,
      )
    )
      return;
    await call(
      { action: "remove", objectId: it.objectId },
      `Removido: ${itemName(it.itemId)}`,
    );
  }

  async function modifyItem(it: AdminGmInventoryItem) {
    const cStr = prompt(
      `Nova quantidade pra ${itemName(it.itemId)} (atual: ${it.count}). Vazio mantém.`,
      "",
    );
    const eStr = prompt(
      `Novo enchant pra ${itemName(it.itemId)} (atual: +${it.enchantLevel}, 0-40). Vazio mantém.`,
      "",
    );
    const patch: { count?: number; enchantLevel?: number } = {};
    if (cStr && cStr.trim() !== "") {
      const c = Number(cStr);
      if (!Number.isFinite(c) || c < 0) {
        show("Quantidade inválida", "error");
        return;
      }
      patch.count = c;
    }
    if (eStr && eStr.trim() !== "") {
      const e = Number(eStr);
      if (!Number.isFinite(e) || e < 0 || e > 40) {
        show("Enchant inválido (0-40)", "error");
        return;
      }
      patch.enchantLevel = e;
    }
    if (Object.keys(patch).length === 0) return;
    await call(
      { action: "modify", objectId: it.objectId, ...patch },
      `Modificado: ${itemName(it.itemId)}`,
    );
  }

  return (
    <>
      {char.online && (
        <div className="mb-4 rounded-md border border-l2-red/40 bg-l2-red/5 px-4 py-3 text-sm text-l2-red">
          ⚠️ Char está ONLINE. Mutações no inventário só rodam quando ele
          deslogar.
        </div>
      )}

      {/* Adicionar item */}
      <section className="mb-6 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-5">
        <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-white">
          Adicionar item ao inventário
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/55">
              Item
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
                  📋 Clique pra abrir o catálogo de items…
                </span>
              )}
            </button>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/55">
              Qtd
            </label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              min={1}
              className="w-28 rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/55">
              +Enchant
            </label>
            <input
              type="number"
              value={enchant}
              onChange={(e) => setEnchant(e.target.value)}
              min={0}
              max={40}
              className="w-28 rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={addItem}
            disabled={!picked || busy}
            className="rounded-md px-5 py-2 font-display text-xs font-bold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "var(--l2-gold-gradient)" }}
          >
            {busy ? "Adicionando..." : "Adicionar"}
          </button>
        </div>
      </section>

      {/* Filtro do inventário */}
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtrar inventário (nome ou ID)…"
        className="mb-4 w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 text-sm text-white focus:border-l2-gold focus:outline-none"
      />

      {/* Tabelas por location */}
      {LOCATIONS.map((loc) => {
        const list = grouped[loc] ?? [];
        if (list.length === 0) return null;
        return (
          <section
            key={loc}
            className="mb-6 overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]"
          >
            <div className="border-b border-white/5 px-6 py-3">
              <h3 className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/55">
                {loc} ({list.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-2 text-left">Item</th>
                    <th className="px-6 py-2 text-left">Grade</th>
                    <th className="px-6 py-2 text-right">Qtd</th>
                    <th className="px-6 py-2 text-right">+Enchant</th>
                    <th className="px-6 py-2 text-right">Object ID</th>
                    <th className="px-6 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((it) => {
                    const grade = itemGrade(it.itemId);
                    return (
                      <tr
                        key={it.objectId}
                        className="border-b border-white/5 last:border-0 hover:bg-white/3"
                      >
                        <td className="px-6 py-2">
                          <div className="flex items-center gap-3">
                            <ItemIcon itemId={it.itemId} size={32} />
                            <div>
                              <div className="font-display text-sm text-white">
                                {itemName(it.itemId)}
                              </div>
                              <div className="font-mono text-[10px] text-white/45">
                                #{it.itemId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-2 text-xs text-white/65">
                          {grade === "NONE" ? "—" : grade}
                        </td>
                        <td className="px-6 py-2 text-right tabular-nums text-white/85">
                          {it.count.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-6 py-2 text-right tabular-nums text-white/85">
                          {it.enchantLevel > 0 ? `+${it.enchantLevel}` : "—"}
                        </td>
                        <td className="px-6 py-2 text-right font-mono text-[10px] text-white/45">
                          {it.objectId}
                        </td>
                        <td className="px-6 py-2">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => modifyItem(it)}
                              disabled={busy || char.online}
                              className="rounded border border-white/10 px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-white/75 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(it)}
                              disabled={busy || char.online}
                              className="rounded border border-l2-red/40 px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-l2-red transition hover:bg-l2-red/10 disabled:opacity-40"
                            >
                              Remover
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {Object.keys(grouped).length === 0 && (
        <div className="rounded-md border border-white/10 px-4 py-3 text-sm text-white/65">
          Nenhum item no inventário (ou nenhum casa com o filtro).
        </div>
      )}

      <ItemPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(it) => setPicked(it)}
      />
    </>
  );
}
