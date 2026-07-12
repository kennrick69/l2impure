"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  EVENT_CATALOG,
  type EventFieldDef,
} from "@/lib/event-config-catalog";

export type EventConfigDto = {
  slug: string;
  displayName: string;
  enabled: boolean;
  config: Record<string, number | boolean | string>;
  fileTarget: string;
  lastAppliedAt: string | null;
  updatedAt: string;
};

type Draft = {
  enabled: boolean;
  config: Record<string, number | boolean | string>;
};

function toDraft(e: EventConfigDto): Draft {
  return { enabled: e.enabled, config: { ...e.config } };
}

function isDirty(draft: Draft, e: EventConfigDto): boolean {
  if (draft.enabled !== e.enabled) return true;
  for (const [k, v] of Object.entries(draft.config)) {
    if (e.config[k] !== v) return true;
  }
  return false;
}

const inputCls =
  "w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-l2-red/60 focus:outline-none";
const labelCls =
  "mb-1 block font-display text-[10px] font-semibold uppercase tracking-wider text-white/45";

function FieldInput({
  field,
  value,
  onChange,
  idPrefix,
}: {
  field: EventFieldDef;
  value: number | boolean | string;
  onChange: (v: number | boolean | string) => void;
  idPrefix: string;
}) {
  const id = `${idPrefix}-${field.key}`;
  if (field.type === "bool") {
    return (
      <label className="flex cursor-pointer items-center gap-3 pt-5">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="relative h-5 w-9 shrink-0 rounded-full bg-white/15 transition peer-checked:bg-l2-green/70 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4" />
        <span className="text-xs text-white/70">{field.label}</span>
      </label>
    );
  }
  if (field.type === "int") {
    return (
      <div>
        <label className={labelCls} htmlFor={id}>
          {field.label}
        </label>
        <input
          id={id}
          type="number"
          min={field.min}
          max={field.max}
          className={inputCls}
          value={typeof value === "number" ? value : Number(value) || 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {field.help ? (
          <div className="mt-1 text-[11px] text-white/35">{field.help}</div>
        ) : null}
      </div>
    );
  }
  return (
    <div className={field.type === "timeList" ? "sm:col-span-2" : undefined}>
      <label className={labelCls} htmlFor={id}>
        {field.label}
      </label>
      <input
        id={id}
        className={inputCls}
        value={String(value ?? "")}
        placeholder={field.help}
        onChange={(e) => onChange(e.target.value)}
      />
      {field.help ? (
        <div className="mt-1 text-[11px] text-white/35">{field.help}</div>
      ) : null}
    </div>
  );
}

export function EventConfigManager({
  initialEvents,
}: {
  initialEvents: EventConfigDto[];
}) {
  const { show } = useToast();
  const [events, setEvents] = useState(initialEvents);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(initialEvents.map((e) => [e.slug, toDraft(e)])),
  );
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);

  const neverApplied = events.filter((e) => !e.lastAppliedAt);
  const pendingRestart = events.some((e) => e.lastAppliedAt);

  function setDraftField(
    slug: string,
    key: string,
    value: number | boolean | string,
  ) {
    setDrafts((d) => ({
      ...d,
      [slug]: { ...d[slug]!, config: { ...d[slug]!.config, [key]: value } },
    }));
  }

  async function apply(evt: EventConfigDto) {
    const draft = drafts[evt.slug];
    if (!draft) return;
    setSaving(evt.slug);
    try {
      const res = await fetch(`/api/admin/events/${evt.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: draft.enabled, config: draft.config }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fields?: { key: string; message: string }[];
        event?: EventConfigDto & { lastAppliedAt: string | null };
      };
      if (!res.ok) {
        const detail = data.fields
          ?.map((f) => `${f.key}: ${f.message}`)
          .join("; ");
        show(detail ? `${data.error} — ${detail}` : (data.error ?? "Falha ao aplicar"), "error");
        return;
      }
      const updated: EventConfigDto = {
        ...evt,
        enabled: draft.enabled,
        config: { ...draft.config },
        lastAppliedAt: data.event?.lastAppliedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setEvents((list) => list.map((e) => (e.slug === evt.slug ? updated : e)));
      setDrafts((d) => ({ ...d, [evt.slug]: toDraft(updated) }));
      show(
        `${evt.displayName} aplicado na VPS — falta o reload do gameserver`,
        "success",
      );
    } catch {
      show("Erro de rede", "error");
    } finally {
      setSaving(null);
    }
  }

  async function reload() {
    setConfirmReload(false);
    setReloading(true);
    try {
      const res = await fetch("/api/admin/events/reload", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        show(data.error ?? "Falha no reload", "error");
        return;
      }
      show("Gameserver reiniciando — volta em ~30-60s", "success");
    } catch {
      show("Erro de rede", "error");
    } finally {
      setReloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Status geral + reload */}
      <section className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <div className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/45">
              Eventos ativos
            </div>
            <div className="font-display text-2xl font-bold text-white">
              {events.filter((e) => e.enabled).length}{" "}
              <span className="text-base font-semibold text-white/40">
                de {events.length}
              </span>
            </div>
          </div>
          <div className="flex-1 text-xs leading-relaxed text-white/65">
            <div>
              Fluxo: editar campos → <strong>Aplicar</strong> (grava o
              .properties na VPS com backup) → <strong>Reload gameserver</strong>{" "}
              (uma vez, depois de aplicar tudo que quiser).
            </div>
            <div className="mt-1 text-white/40">
              Horários em BRT. Evitar reload durante Olympiad/evento em
              andamento — matches em curso são cancelados.
            </div>
          </div>
          <div className="flex items-center gap-3">
            {confirmReload ? (
              <>
                <span className="text-xs text-l2-gold">
                  Jogadores online caem ~30-60s. Confirmar?
                </span>
                <button
                  type="button"
                  onClick={reload}
                  className="rounded-md bg-l2-red px-4 py-2 font-display text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-l2-red/85"
                >
                  Sim, reiniciar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReload(false)}
                  className="rounded-md border border-white/15 px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-wider text-white/75 transition hover:text-white"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={reloading}
                onClick={() => setConfirmReload(true)}
                className="rounded-md border border-l2-red/50 px-4 py-2 font-display text-[11px] font-bold uppercase tracking-wider text-l2-red transition hover:bg-l2-red hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {reloading ? "Reiniciando…" : "Reload gameserver"}
              </button>
            )}
          </div>
        </div>
        {neverApplied.length > 0 ? (
          <div className="mt-4 rounded-md border border-l2-gold/30 bg-l2-gold/10 px-4 py-3 text-xs text-l2-gold">
            [ATENÇÃO] Nunca aplicados pelo painel (valores importados da VPS
            em 12/07/2026): {neverApplied.map((e) => e.displayName).join(", ")}.
            Ao aplicar, o painel passa a ser a fonte de verdade desses eventos.
          </div>
        ) : null}
        {pendingRestart ? (
          <div className="mt-3 text-[11px] text-white/40">
            Lembrete: config aplicada só entra em vigor no jogo após o reload.
          </div>
        ) : null}
      </section>

      {/* Cards por evento (accordion) */}
      {events.map((evt) => {
        const def = EVENT_CATALOG[evt.slug];
        if (!def) return null;
        const draft = drafts[evt.slug] ?? toDraft(evt);
        const dirty = isDirty(draft, evt);
        const busy = saving === evt.slug;
        const isOpen = open[evt.slug] ?? false;
        return (
          <section
            key={evt.slug}
            className={`rounded-xl border bg-[color:var(--l2-bg-card)] transition ${
              evt.enabled ? "border-l2-green/25" : "border-white/5"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpen((o) => ({ ...o, [evt.slug]: !isOpen }))}
              className="flex w-full flex-wrap items-center gap-3 px-6 py-4 text-left"
            >
              <span className="font-display text-[10px] text-white/40">
                {isOpen ? "▼" : "►"}
              </span>
              <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white">
                {evt.displayName}
              </h2>
              <code className="rounded bg-black/30 px-2 py-0.5 text-[11px] text-white/45">
                {evt.fileTarget}
              </code>
              <span
                className={`rounded-md px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider ${
                  evt.enabled
                    ? "bg-l2-green/15 text-l2-green"
                    : "bg-white/10 text-white/45"
                }`}
              >
                {def.hasEnabledToggle
                  ? evt.enabled
                    ? "Ativo"
                    : "Inativo"
                  : "Sempre ativo"}
              </span>
              {dirty ? (
                <span className="rounded-md bg-l2-gold/15 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-l2-gold">
                  Não aplicado
                </span>
              ) : null}
              <span className="ml-auto text-[11px] text-white/35">
                {evt.lastAppliedAt
                  ? `Aplicado: ${new Date(evt.lastAppliedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
                  : "Nunca aplicado pelo painel"}
              </span>
            </button>

            {isOpen ? (
              <div className="border-t border-white/5 px-6 py-5">
                <p className="mb-4 text-xs text-white/45">{def.description}</p>

                <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {def.fields.map((field) => (
                    <FieldInput
                      key={field.key}
                      field={field}
                      idPrefix={evt.slug}
                      value={draft.config[field.key] ?? ""}
                      onChange={(v) => setDraftField(evt.slug, field.key, v)}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {def.hasEnabledToggle ? (
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [evt.slug]: {
                              ...d[evt.slug]!,
                              enabled: e.target.checked,
                            },
                          }))
                        }
                        className="peer sr-only"
                      />
                      <span className="relative h-6 w-11 rounded-full bg-white/15 transition peer-checked:bg-l2-green/70 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
                      <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-white/75">
                        {draft.enabled ? "Evento ativo" : "Evento desativado"}
                      </span>
                    </label>
                  ) : (
                    <span className="text-[11px] text-white/35">
                      Este evento não tem chave de on/off no aCis.
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={!dirty || busy}
                    onClick={() => apply(evt)}
                    className="ml-auto rounded-md bg-l2-red px-5 py-2 font-display text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-l2-red/85 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy ? "Aplicando…" : dirty ? "Aplicar na VPS" : "Aplicado"}
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
