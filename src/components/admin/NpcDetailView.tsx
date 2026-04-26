"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useItemsMetadata, itemName } from "@/lib/use-items-metadata";
import { ItemPickerModal } from "@/components/admin/ItemPickerModal";
import type {
  NpcMetadata,
  NpcSpawn,
  NpcSpawnsResponse,
  NpcDialogueFile,
  NpcDialoguesResponse,
  NpcDialogueRead,
  NpcBuylist,
  NpcBuylistsResponse,
  ItemMetadata,
} from "@/lib/bridge";

type Tab = "stats" | "spawns" | "dialogues" | "buylists" | "rename";

export function NpcDetailView({ template }: { template: NpcMetadata }) {
  // Pré-carrega metadata de items pra render de buylists
  useItemsMetadata();
  const [tab, setTab] = useState<Tab>("stats");

  return (
    <>
      <Header tpl={template} />
      <div className="my-6 flex gap-1 overflow-x-auto border-b border-white/5">
        <TabButton active={tab === "stats"} onClick={() => setTab("stats")}>Stats</TabButton>
        <TabButton active={tab === "spawns"} onClick={() => setTab("spawns")}>Spawns</TabButton>
        <TabButton active={tab === "dialogues"} onClick={() => setTab("dialogues")}>Diálogos</TabButton>
        <TabButton active={tab === "buylists"} onClick={() => setTab("buylists")}>Buylists</TabButton>
        <TabButton active={tab === "rename"} onClick={() => setTab("rename")}>Renomear</TabButton>
      </div>

      {tab === "stats" && <StatsTab tpl={template} />}
      {tab === "spawns" && <SpawnsTab npcId={template.id} />}
      {tab === "dialogues" && <DialoguesTab npcId={template.id} />}
      {tab === "buylists" && <BuylistsTab npcId={template.id} />}
      {tab === "rename" && <RenameTab tpl={template} />}
    </>
  );
}

function Header({ tpl }: { tpl: NpcMetadata }) {
  return (
    <div className="rounded-xl border border-l2-gold/40 bg-l2-gold/5 p-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
          {tpl.name}
        </h1>
        {tpl.title && <span className="text-sm text-white/65">"{tpl.title}"</span>}
        <span className="font-mono text-xs text-white/45">#{tpl.id}</span>
        <span className="text-xs text-white/55">{tpl.type ?? "—"}</span>
        <span className="font-display text-sm text-l2-gold">Lv {tpl.level}</span>
      </div>
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
      className={`relative shrink-0 px-5 py-2.5 font-display text-xs font-semibold uppercase tracking-wider transition ${
        active ? "text-l2-gold" : "text-white/55 hover:text-white"
      }`}
    >
      {children}
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-l2-gold" />}
    </button>
  );
}

/* =============== Stats Tab =============== */

function StatsTab({ tpl }: { tpl: NpcMetadata }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Level" value={tpl.level} />
      <StatCard label="HP" value={Math.round(tpl.hp).toLocaleString("pt-BR")} />
      <StatCard label="MP" value={Math.round(tpl.mp).toLocaleString("pt-BR")} />
      <StatCard label="EXP" value={tpl.exp.toLocaleString("pt-BR")} />
      <StatCard label="SP" value={tpl.sp.toLocaleString("pt-BR")} />
      <StatCard label="P.Atk" value={Math.round(tpl.pAtk)} />
      <StatCard label="P.Def" value={Math.round(tpl.pDef)} />
      <StatCard label="M.Atk" value={Math.round(tpl.mAtk)} />
      <StatCard label="M.Def" value={Math.round(tpl.mDef)} />
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-4">
      <div className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/45">
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-bold text-white">{value}</div>
    </div>
  );
}

/* =============== Spawns Tab =============== */

function SpawnsTab({ npcId }: { npcId: number }) {
  const router = useRouter();
  const { show } = useToast();
  const [data, setData] = useState<NpcSpawnsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newCoords, setNewCoords] = useState({ x: "", y: "", z: "", heading: "0", respawnDelay: "60" });

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/npcs/${npcId}/spawns`);
      const j = await r.json();
      if (r.ok) setData(j as NpcSpawnsResponse);
      else show(j.error ?? "Falha", "error");
    } catch {
      show("Erro de rede", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npcId]);

  async function call(payload: Record<string, unknown>, msg: string) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/npcs/${npcId}/spawns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!r.ok) {
        if (j.code === "pin_required") {
          show("PIN GM expirado. Vá em /admin/game-master e digite o PIN.", "info");
          return false;
        }
        show(j.error ?? "Falha", "error");
        return false;
      }
      show(msg, "success");
      router.refresh();
      load();
      return true;
    } catch {
      show("Erro de rede", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addSpawn() {
    const x = Number(newCoords.x);
    const y = Number(newCoords.y);
    const z = Number(newCoords.z);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      show("Coords inválidas", "error");
      return;
    }
    const ok = await call(
      {
        action: "add",
        x,
        y,
        z,
        heading: Number(newCoords.heading) || 0,
        respawnDelay: Number(newCoords.respawnDelay) || 60,
      },
      `Spawn adicionado em (${x}, ${y}, ${z})`,
    );
    if (ok) setNewCoords({ x: "", y: "", z: "", heading: "0", respawnDelay: "60" });
  }

  async function removeSpawn(s: NpcSpawn) {
    if (!confirm(`Remover spawn em (${s.x}, ${s.y}, ${s.z})?`)) return;
    await call(
      { action: "remove", x: s.x, y: s.y, z: s.z },
      "Spawn removido",
    );
  }

  async function moveSpawn(s: NpcSpawn) {
    const newCoordsStr = prompt(
      `Novas coords pra (${s.x}, ${s.y}, ${s.z})? Formato: x,y,z`,
      `${s.x},${s.y},${s.z}`,
    );
    if (!newCoordsStr) return;
    const parts = newCoordsStr.split(",").map((p) => Number(p.trim()));
    if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) {
      show("Formato inválido (x,y,z)", "error");
      return;
    }
    await call(
      {
        action: "move",
        x: s.x,
        y: s.y,
        z: s.z,
        newX: parts[0],
        newY: parts[1],
        newZ: parts[2],
      },
      `Movido pra (${parts[0]}, ${parts[1]}, ${parts[2]})`,
    );
  }

  return (
    <>
      <section className="mb-4 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-5">
        <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-white">
          Adicionar spawn novo
        </h3>
        <div className="grid gap-2 sm:grid-cols-5">
          {(["x", "y", "z", "heading", "respawnDelay"] as const).map((k) => (
            <label
              key={k}
              className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/55"
            >
              {k}
              <input
                type="number"
                value={newCoords[k]}
                onChange={(e) => setNewCoords({ ...newCoords, [k]: e.target.value })}
                className="rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none"
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={addSpawn}
          disabled={busy}
          className="mt-3 rounded-md px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-black disabled:opacity-50"
          style={{ background: "var(--l2-gold-gradient)" }}
        >
          Adicionar spawn
        </button>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <div className="border-b border-white/5 px-6 py-3">
          <h3 className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/55">
            Spawns existentes ({data?.count ?? 0})
          </h3>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-white/55">Carregando…</div>
        ) : !data || data.spawns.length === 0 ? (
          <div className="p-6 text-sm text-white/55">Nenhum spawn registrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                <tr className="border-b border-white/5">
                  <th className="px-6 py-2 text-right">X</th>
                  <th className="px-6 py-2 text-right">Y</th>
                  <th className="px-6 py-2 text-right">Z</th>
                  <th className="px-6 py-2 text-right">Heading</th>
                  <th className="px-6 py-2 text-right">Respawn</th>
                  <th className="px-6 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.spawns.map((s, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <td className="px-6 py-2 text-right font-mono tabular-nums text-white/85">{s.x}</td>
                    <td className="px-6 py-2 text-right font-mono tabular-nums text-white/85">{s.y}</td>
                    <td className="px-6 py-2 text-right font-mono tabular-nums text-white/85">{s.z}</td>
                    <td className="px-6 py-2 text-right text-xs text-white/65">{s.heading}</td>
                    <td className="px-6 py-2 text-right text-xs text-white/65">{s.respawnDelay}s</td>
                    <td className="px-6 py-2">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => moveSpawn(s)}
                          disabled={busy}
                          className="rounded border border-white/10 px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-white/75 hover:bg-white/5 hover:text-white disabled:opacity-40"
                        >
                          Mover
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSpawn(s)}
                          disabled={busy}
                          className="rounded border border-l2-red/40 px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-l2-red hover:bg-l2-red/10 disabled:opacity-40"
                        >
                          Remover
                        </button>
                      </div>
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

/* =============== Dialogues Tab =============== */

function DialoguesTab({ npcId }: { npcId: number }) {
  const { show } = useToast();
  const [files, setFiles] = useState<NpcDialogueFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [readingFile, setReadingFile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/admin/npcs/${npcId}/dialogues`);
        const j = (await r.json()) as NpcDialoguesResponse;
        if (!cancelled) setFiles(j.files ?? []);
      } catch {
        /* noop */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [npcId]);

  async function openFile(p: string) {
    setOpenPath(p);
    setEditing(false);
    setReadingFile(true);
    try {
      const r = await fetch(
        `/api/admin/npcs/dialogue?path=${encodeURIComponent(p)}`,
      );
      const j = (await r.json()) as NpcDialogueRead | { error: string };
      if ("error" in j) {
        show(j.error, "error");
        return;
      }
      setContent(j.content);
    } catch {
      show("Erro de rede", "error");
    } finally {
      setReadingFile(false);
    }
  }

  async function save() {
    if (!openPath) return;
    setSaving(true);
    try {
      const r = await fetch(
        `/api/admin/npcs/dialogue?path=${encodeURIComponent(openPath)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );
      const j = (await r.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!r.ok) {
        if (j.code === "pin_required") {
          show("PIN GM expirado. Vá em /admin/game-master.", "info");
          return;
        }
        show(j.error ?? "Falha", "error");
        return;
      }
      show("Salvo. Reinicie o server pra valer in-game.", "success");
      setEditing(false);
    } catch {
      show("Erro de rede", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <section className="overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <div className="border-b border-white/5 px-4 py-3">
          <h3 className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/55">
            Arquivos ({files.length})
          </h3>
        </div>
        {loading ? (
          <div className="p-4 text-xs text-white/55">Carregando…</div>
        ) : files.length === 0 ? (
          <div className="p-4 text-xs text-white/55">
            Nenhum HTM associado a esse NPC.
          </div>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto">
            {files.map((f) => (
              <li key={f.path}>
                <button
                  type="button"
                  onClick={() => openFile(f.path)}
                  className={`flex w-full flex-col gap-0.5 border-b border-white/5 px-4 py-2 text-left transition hover:bg-white/3 ${
                    openPath === f.path ? "bg-white/5" : ""
                  }`}
                >
                  <span className="font-mono text-[11px] text-white/85">
                    {f.path}
                  </span>
                  <span className="text-[10px] text-white/45">
                    {f.size} bytes
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-5">
        {!openPath ? (
          <p className="text-sm text-white/55">
            Selecione um arquivo à esquerda pra ver/editar.
          </p>
        ) : readingFile ? (
          <p className="text-sm text-white/55">Carregando…</p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-white/85">{openPath}</span>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      disabled={saving}
                      className="rounded-md border border-white/10 px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-wider text-white/65 hover:bg-white/5 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={save}
                      disabled={saving}
                      className="rounded-md px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-black disabled:opacity-50"
                      style={{ background: "var(--l2-gold-gradient)" }}
                    >
                      {saving ? "Salvando..." : "Salvar"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="rounded-md border border-l2-gold/40 px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-wider text-l2-gold hover:bg-l2-gold/10"
                  >
                    Editar
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              readOnly={!editing}
              rows={20}
              className={`w-full resize-y rounded-md border bg-[color:var(--l2-bg-input)] px-3 py-2 font-mono text-xs ${editing ? "border-l2-gold text-white" : "border-white/8 text-white/75"}`}
            />
          </>
        )}
      </section>
    </div>
  );
}

/* =============== Buylists Tab =============== */

function BuylistsTab({ npcId }: { npcId: number }) {
  const { show } = useToast();
  const [data, setData] = useState<NpcBuylistsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [pickedItem, setPickedItem] = useState<ItemMetadata | null>(null);
  const [price, setPrice] = useState("100");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/npcs/${npcId}/buylists`);
      const j = (await r.json()) as NpcBuylistsResponse;
      setData(j);
    } catch {
      show("Erro de rede", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npcId]);

  async function addProduct(buyListId: number) {
    if (!pickedItem) {
      show("Selecione um item primeiro", "error");
      return;
    }
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0) {
      show("Preço inválido", "error");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(
        `/api/admin/npcs/buylists/${buyListId}/products`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: pickedItem.id, price: p }),
        },
      );
      const j = (await r.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!r.ok) {
        if (j.code === "pin_required") show("PIN GM expirado", "info");
        else show(j.error ?? "Falha", "error");
        return;
      }
      show(`Adicionado ${pickedItem.name} a buyList ${buyListId}`, "success");
      setPickedItem(null);
      load();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct(buyListId: number, itemId: number) {
    if (!confirm(`Remover item #${itemId} da buyList ${buyListId}?`)) return;
    setBusy(true);
    try {
      const r = await fetch(
        `/api/admin/npcs/buylists/${buyListId}/products`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId }),
        },
      );
      const j = (await r.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!r.ok) {
        if (j.code === "pin_required") show("PIN GM expirado", "info");
        else show(j.error ?? "Falha", "error");
        return;
      }
      show("Removido", "success");
      load();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-white/55">Carregando…</p>;
  }
  if (!data || data.buylists.length === 0) {
    return (
      <p className="text-sm text-white/55">
        Esse NPC não tem buylists cadastradas em buyLists.xml.
      </p>
    );
  }

  return (
    <>
      {data.buylists.map((bl: NpcBuylist) => (
        <section
          key={bl.buyListId}
          className="mb-4 overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]"
        >
          <div className="border-b border-white/5 px-6 py-3">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
              BuyList #{bl.buyListId} — {bl.products.length} items
            </h3>
          </div>

          <div className="border-b border-white/5 bg-black/20 px-6 py-4">
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/55">
                  Item pra adicionar
                </label>
                <button
                  type="button"
                  onClick={() => setPickerFor(bl.buyListId)}
                  className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-left text-sm text-white hover:border-l2-gold"
                >
                  {pickedItem && pickerFor === null ? (
                    <span>
                      <span className="font-display font-semibold">
                        {pickedItem.name}
                      </span>
                      <span className="ml-2 font-mono text-[10px] text-white/45">
                        #{pickedItem.id}
                      </span>
                    </span>
                  ) : (
                    <span className="text-white/55">📋 Abrir catálogo…</span>
                  )}
                </button>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/55">
                  Preço (adena)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min={0}
                  className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => addProduct(bl.buyListId)}
                disabled={busy || !pickedItem}
                className="rounded-md px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-black disabled:opacity-50"
                style={{ background: "var(--l2-gold-gradient)" }}
              >
                Adicionar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                <tr className="border-b border-white/5">
                  <th className="px-6 py-2 text-left">Item</th>
                  <th className="px-6 py-2 text-right">Preço</th>
                  <th className="px-6 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {bl.products.map((p) => (
                  <tr
                    key={p.itemId}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="px-6 py-2">
                      <div className="font-display text-sm text-white">
                        {itemName(p.itemId)}
                      </div>
                      <div className="font-mono text-[10px] text-white/45">
                        #{p.itemId}
                      </div>
                    </td>
                    <td className="px-6 py-2 text-right tabular-nums text-l2-gold">
                      {p.price.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-6 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeProduct(bl.buyListId, p.itemId)}
                        disabled={busy}
                        className="rounded border border-l2-red/40 px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-l2-red hover:bg-l2-red/10 disabled:opacity-40"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <ItemPickerModal
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onSelect={(it) => {
          setPickedItem(it);
          setPickerFor(null);
        }}
      />
    </>
  );
}

/* =============== Rename Tab =============== */

function RenameTab({ tpl }: { tpl: NpcMetadata }) {
  const router = useRouter();
  const { show } = useToast();
  const [name, setName] = useState(tpl.name);
  const [title, setTitle] = useState(tpl.title);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) {
      show("Nome não pode ser vazio", "error");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/npcs/${tpl.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), title: title.trim() }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        file?: string;
      };
      if (!r.ok) {
        if (j.code === "pin_required") show("PIN GM expirado", "info");
        else show(j.error ?? "Falha", "error");
        return;
      }
      show(
        `XML ${j.file} atualizado. Reinicie o server pra valer in-game.`,
        "success",
      );
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
      <p className="mb-4 text-sm text-white/65">
        Edita os atributos <code className="rounded bg-black/30 px-1.5">name</code>{" "}
        e <code className="rounded bg-black/30 px-1.5">title</code> diretamente
        no XML do fork. Backup automático em{" "}
        <code className="font-mono text-[11px]">.bak</code> antes da escrita.
        Pra valer in-game, reinicie o server depois.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/55">
          Nome
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={75}
            className="rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/55">
          Título
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={75}
            className="rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={save}
        disabled={busy || (name === tpl.name && title === tpl.title)}
        className="mt-5 rounded-md px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: "var(--l2-gold-gradient)" }}
      >
        {busy ? "Salvando..." : "Salvar no XML"}
      </button>
    </section>
  );
}
