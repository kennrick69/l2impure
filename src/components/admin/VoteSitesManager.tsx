"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export type VoteSiteDto = {
  id: number;
  slug: string;
  displayName: string;
  serverId: string | null;
  callbackUrl: string;
  callbackMethod: string;
  active: boolean;
  cooldownHours: number;
  rewardCoins: number;
  rewardDescription: string | null;
  notes: string | null;
  updatedAt: string;
};

type Editable = {
  serverId: string;
  active: boolean;
  cooldownHours: number;
  rewardCoins: number;
  rewardDescription: string;
  notes: string;
};

function toEditable(s: VoteSiteDto): Editable {
  return {
    serverId: s.serverId ?? "",
    active: s.active,
    cooldownHours: s.cooldownHours,
    rewardCoins: s.rewardCoins,
    rewardDescription: s.rewardDescription ?? "",
    notes: s.notes ?? "",
  };
}

function isDirty(a: Editable, b: Editable): boolean {
  return (
    a.serverId !== b.serverId ||
    a.active !== b.active ||
    a.cooldownHours !== b.cooldownHours ||
    a.rewardCoins !== b.rewardCoins ||
    a.rewardDescription !== b.rewardDescription ||
    a.notes !== b.notes
  );
}

const inputCls =
  "w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-l2-red/60 focus:outline-none";
const labelCls =
  "mb-1 block font-display text-[10px] font-semibold uppercase tracking-wider text-white/45";

export function VoteSitesManager({
  initialSites,
}: {
  initialSites: VoteSiteDto[];
}) {
  const { show } = useToast();
  const [sites, setSites] = useState(initialSites);
  const [drafts, setDrafts] = useState<Record<number, Editable>>(() =>
    Object.fromEntries(initialSites.map((s) => [s.id, toEditable(s)])),
  );
  const [saving, setSaving] = useState<number | null>(null);

  const activeCount = sites.filter((s) => s.active).length;
  const missingServerId = sites.filter((s) => !(drafts[s.id]?.serverId ?? s.serverId));

  function setDraft(id: number, patch: Partial<Editable>) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id]!, ...patch } }));
  }

  async function copyCallback(site: VoteSiteDto) {
    try {
      await navigator.clipboard.writeText(site.callbackUrl);
      show("Callback URL copiada", "success");
    } catch {
      show("Falha ao copiar — copie manualmente", "error");
    }
  }

  async function save(site: VoteSiteDto) {
    const draft = drafts[site.id];
    if (!draft) return;
    setSaving(site.id);
    try {
      const res = await fetch(`/api/admin/vote-sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverId: draft.serverId.trim() || null,
          active: draft.active,
          cooldownHours: draft.cooldownHours,
          rewardCoins: draft.rewardCoins,
          rewardDescription: draft.rewardDescription.trim() || null,
          notes: draft.notes.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        site?: VoteSiteDto;
      };
      if (!res.ok) {
        show(data.error ?? "Falha ao salvar", "error");
        return;
      }
      const updated = data.site!;
      setSites((list) => list.map((s) => (s.id === site.id ? updated : s)));
      setDrafts((d) => ({ ...d, [site.id]: toEditable(updated) }));
      show(`${site.displayName} salvo`, "success");
    } catch {
      show("Erro de rede", "error");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Checklist / status geral */}
      <section className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <div className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/45">
              Sites ativos
            </div>
            <div className="font-display text-2xl font-bold text-white">
              {activeCount}{" "}
              <span className="text-base font-semibold text-white/40">
                de {sites.length}
              </span>
            </div>
          </div>
          <div className="flex-1 text-xs leading-relaxed text-white/65">
            {missingServerId.length > 0 ? (
              <>
                <span className="font-semibold text-l2-gold">Pendentes de server ID:</span>{" "}
                {missingServerId.map((s) => s.displayName).join(", ")}
              </>
            ) : (
              <span className="text-l2-green">
                [OK] Todos os sites têm server ID cadastrado.
              </span>
            )}
            <div className="mt-1 text-white/40">
              Fluxo por ranking: cadastrar o servidor no site do ranking →
              colar a callback URL lá → copiar o server ID de volta aqui →
              ativar o toggle → salvar.
            </div>
          </div>
        </div>
      </section>

      {/* Cards por site */}
      {sites.map((site) => {
        const draft = drafts[site.id] ?? toEditable(site);
        const dirty = isDirty(draft, toEditable(site));
        const busy = saving === site.id;
        return (
          <section
            key={site.id}
            className={`rounded-xl border bg-[color:var(--l2-bg-card)] p-6 transition ${
              site.active ? "border-l2-green/25" : "border-white/5"
            }`}
          >
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white">
                {site.displayName}
              </h2>
              <code className="rounded bg-black/30 px-2 py-0.5 text-[11px] text-white/45">
                {site.slug}
              </code>
              <span
                className={`rounded-md px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider ${
                  site.callbackMethod === "POST"
                    ? "bg-l2-gold/15 text-l2-gold"
                    : "bg-white/10 text-white/65"
                }`}
              >
                {site.callbackMethod}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider ${
                  site.active
                    ? "bg-l2-green/15 text-l2-green"
                    : "bg-white/10 text-white/45"
                }`}
              >
                {site.active ? "Ativo" : "Inativo"}
              </span>
              <span className="ml-auto text-[11px] text-white/35">
                Última edição:{" "}
                {new Date(site.updatedAt).toLocaleString("pt-BR")}
              </span>
            </div>

            <div className="mb-4">
              <span className={labelCls}>
                Callback URL (colar no painel do ranking)
              </span>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-md border border-white/10 bg-black/40 px-3 py-2 text-xs text-l2-gold">
                  {site.callbackUrl}
                </code>
                <button
                  type="button"
                  onClick={() => copyCallback(site)}
                  className="shrink-0 rounded-md border border-white/15 px-3 py-2 font-display text-[10px] font-semibold uppercase tracking-wider text-white/75 transition hover:border-l2-red/50 hover:text-white"
                >
                  Copiar
                </button>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelCls} htmlFor={`sid-${site.id}`}>
                  Server ID no ranking
                </label>
                <input
                  id={`sid-${site.id}`}
                  className={inputCls}
                  value={draft.serverId}
                  placeholder="preencher após cadastro"
                  onChange={(e) => setDraft(site.id, { serverId: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor={`cd-${site.id}`}>
                  Cooldown (horas)
                </label>
                <input
                  id={`cd-${site.id}`}
                  type="number"
                  min={1}
                  max={168}
                  className={inputCls}
                  value={draft.cooldownHours}
                  onChange={(e) =>
                    setDraft(site.id, {
                      cooldownHours: Math.max(1, Math.min(168, Number(e.target.value) || 1)),
                    })
                  }
                />
              </div>
              <div>
                <label className={labelCls} htmlFor={`rc-${site.id}`}>
                  Recompensa (coins)
                </label>
                <input
                  id={`rc-${site.id}`}
                  type="number"
                  min={0}
                  max={100000}
                  className={inputCls}
                  value={draft.rewardCoins}
                  onChange={(e) =>
                    setDraft(site.id, {
                      rewardCoins: Math.max(0, Math.min(100000, Number(e.target.value) || 0)),
                    })
                  }
                />
              </div>
              <div>
                <label className={labelCls} htmlFor={`rd-${site.id}`}>
                  Descrição da recompensa
                </label>
                <input
                  id={`rd-${site.id}`}
                  className={inputCls}
                  value={draft.rewardDescription}
                  placeholder="ex: 1 vote coin"
                  onChange={(e) =>
                    setDraft(site.id, { rewardDescription: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="mb-5">
              <label className={labelCls} htmlFor={`nt-${site.id}`}>
                Notas
              </label>
              <textarea
                id={`nt-${site.id}`}
                rows={2}
                className={`${inputCls} resize-y`}
                value={draft.notes}
                placeholder="anotações livres — login usado, status do cadastro, contatos…"
                onChange={(e) => setDraft(site.id, { notes: e.target.value })}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => setDraft(site.id, { active: e.target.checked })}
                  className="peer sr-only"
                />
                <span className="relative h-6 w-11 rounded-full bg-white/15 transition peer-checked:bg-l2-green/70 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
                <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-white/75">
                  {draft.active ? "Ativo — bridge aceita callbacks" : "Inativo — callbacks bloqueados"}
                </span>
              </label>
              <button
                type="button"
                disabled={!dirty || busy}
                onClick={() => save(site)}
                className="ml-auto rounded-md bg-l2-red px-5 py-2 font-display text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-l2-red/85 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Salvando…" : dirty ? "Salvar" : "Salvo"}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
