"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { CLASS_OPTIONS, TELEPORT_PRESETS } from "@/lib/l2j-classes";
import type { AdminGmCharacter } from "@/lib/bridge";

export function GameMasterPanel() {
  const router = useRouter();
  const { show } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<AdminGmCharacter[] | null>(null);
  const [selected, setSelected] = useState<AdminGmCharacter | null>(null);

  function handlePinExpiry() {
    show("Sessão GM expirada. Reabrindo formulário do PIN…", "info");
    router.refresh();
  }

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setSearching(true);
    setSelected(null);
    try {
      const res = await fetch(
        `/api/admin/gm?action=search&name=${encodeURIComponent(searchTerm.trim())}`,
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        characters?: AdminGmCharacter[];
      };
      if (!res.ok) {
        if (data.code === "pin_required") {
          handlePinExpiry();
          return;
        }
        show(data.error ?? "Falha na busca", "error");
        return;
      }
      const list = data.characters ?? [];
      setResults(list);
      if (list.length === 1 && list[0]) setSelected(list[0]);
    } catch {
      show("Erro de rede", "error");
    } finally {
      setSearching(false);
    }
  }

  async function callAction(payload: Record<string, unknown>, successMsg: string) {
    try {
      const res = await fetch("/api/admin/gm", {
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
          handlePinExpiry();
          return false;
        }
        show(data.error ?? "Falha", "error");
        return false;
      }
      show(successMsg, "success");
      return true;
    } catch {
      show("Erro de rede", "error");
      return false;
    }
  }

  return (
    <>
      <form
        onSubmit={search}
        className="mb-6 flex flex-col gap-3 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-5 sm:flex-row"
      >
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar personagem por nome (LIKE %nome%)"
          className="flex-1 rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 text-sm text-white focus:border-l2-gold focus:outline-none"
        />
        <button
          type="submit"
          disabled={searching || !searchTerm.trim()}
          className="rounded-md px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-black disabled:opacity-50"
          style={{ background: "var(--l2-gold-gradient)" }}
        >
          {searching ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {results !== null && results.length === 0 && (
        <div className="mb-6 rounded-md border border-white/8 bg-[color:var(--l2-bg-card)] px-4 py-3 text-sm text-white/55">
          Nenhum personagem encontrado.
        </div>
      )}

      {results !== null && results.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
          <div className="border-b border-white/5 px-6 py-3 font-display text-[10px] font-semibold uppercase tracking-wider text-white/55">
            {results.length} resultado{results.length === 1 ? "" : "s"}
          </div>
          <ul>
            {results.map((c) => (
              <li
                key={c.charId}
                className={`flex cursor-pointer items-center gap-4 border-b border-white/5 px-6 py-3 text-sm transition last:border-0 hover:bg-white/3 ${
                  selected?.charId === c.charId ? "bg-white/5" : ""
                }`}
                onClick={() => setSelected(c)}
              >
                <span className="font-display font-semibold text-white">
                  {c.name}
                </span>
                <span className="text-white/65">{c.className}</span>
                <span className="font-display text-l2-gold">Lv {c.level}</span>
                <span className="text-xs text-white/55">{c.account}</span>
                <span className="text-xs text-white/55">
                  {c.clanName ?? "—"}
                </span>
                <span className="ml-auto text-xs">
                  {c.online ? (
                    <span className="text-l2-green">Online</span>
                  ) : (
                    <span className="text-white/45">Offline</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selected && <ActionsGrid char={selected} callAction={callAction} />}
    </>
  );
}

function ActionsGrid({
  char,
  callAction,
}: {
  char: AdminGmCharacter;
  callAction: (payload: Record<string, unknown>, msg: string) => Promise<boolean>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SelectedHeader char={char} />
      <CardLevel char={char} callAction={callAction} />
      <CardClass char={char} callAction={callAction} />
      <CardItems char={char} callAction={callAction} />
      <CardAdena char={char} callAction={callAction} />
      <CardTeleport char={char} callAction={callAction} />
      <CardAdmin char={char} callAction={callAction} />
      <CardName char={char} callAction={callAction} />
    </div>
  );
}

function SelectedHeader({ char }: { char: AdminGmCharacter }) {
  return (
    <div className="rounded-xl border border-l2-gold/40 bg-l2-gold/5 p-5 lg:col-span-2">
      <div className="flex flex-wrap items-baseline gap-4">
        <h2 className="font-display text-xl font-bold uppercase tracking-wider text-white">
          {char.name}
        </h2>
        <span className="text-sm text-white/65">
          {char.className} · Lv{" "}
          <strong className="text-l2-gold">{char.level}</strong>
        </span>
        <span className="text-xs text-white/55">conta {char.account}</span>
        <span className="text-xs text-white/55">
          clã {char.clanName ?? "—"}
        </span>
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

function CardShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-5">
      <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-white">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ActionButton({
  loading,
  children,
  disabled,
}: {
  loading: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="rounded-md px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: "var(--l2-gold-gradient)" }}
    >
      {loading ? "..." : children}
    </button>
  );
}

function FieldRow({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-col gap-2 sm:flex-row sm:items-end">{children}</div>;
}

function NumberInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none ${className ?? ""}`}
    />
  );
}

function CardLevel({
  char,
  callAction,
}: {
  char: AdminGmCharacter;
  callAction: (p: Record<string, unknown>, msg: string) => Promise<boolean>;
}) {
  const [level, setLevel] = useState(String(char.level));
  const [busy, setBusy] = useState(false);
  return (
    <CardShell title="Level">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const n = Number(level);
          if (!Number.isFinite(n) || n < 1 || n > 85) return;
          setBusy(true);
          await callAction(
            { action: "set-level", charName: char.name, level: n },
            `Level alterado para ${n}`,
          );
          setBusy(false);
        }}
      >
        <FieldRow>
          <NumberInput value={level} onChange={setLevel} className="w-32" placeholder="1-85" />
          <ActionButton loading={busy}>Alterar level</ActionButton>
        </FieldRow>
      </form>
    </CardShell>
  );
}

function CardClass({
  char,
  callAction,
}: {
  char: AdminGmCharacter;
  callAction: (p: Record<string, unknown>, msg: string) => Promise<boolean>;
}) {
  const [classId, setClassId] = useState(String(char.classId));
  const [busy, setBusy] = useState(false);
  return (
    <CardShell title="Classe">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const n = Number(classId);
          setBusy(true);
          await callAction(
            { action: "set-class", charName: char.name, classId: n },
            `Classe alterada`,
          );
          setBusy(false);
        }}
      >
        <FieldRow>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="flex-1 rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none"
          >
            {CLASS_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.name}
              </option>
            ))}
          </select>
          <ActionButton loading={busy}>Alterar classe</ActionButton>
        </FieldRow>
      </form>
    </CardShell>
  );
}

function CardItems({
  char,
  callAction,
}: {
  char: AdminGmCharacter;
  callAction: (p: Record<string, unknown>, msg: string) => Promise<boolean>;
}) {
  const [itemId, setItemId] = useState("");
  const [count, setCount] = useState("1");
  const [busy, setBusy] = useState(false);
  return (
    <CardShell title="Items">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const i = Number(itemId);
          const c = Number(count);
          if (!Number.isFinite(i) || i <= 0 || !Number.isFinite(c) || c <= 0) return;
          setBusy(true);
          const ok = await callAction(
            { action: "add-item", charName: char.name, itemId: i, count: c },
            `Adicionado ${c}x item ${i}`,
          );
          if (ok) {
            setItemId("");
            setCount("1");
          }
          setBusy(false);
        }}
      >
        <FieldRow>
          <NumberInput value={itemId} onChange={setItemId} placeholder="item ID" className="w-32" />
          <NumberInput value={count} onChange={setCount} placeholder="qtd" className="w-32" />
          <ActionButton loading={busy} disabled={!itemId || !count}>
            Adicionar item
          </ActionButton>
        </FieldRow>
      </form>
    </CardShell>
  );
}

function CardAdena({
  char,
  callAction,
}: {
  char: AdminGmCharacter;
  callAction: (p: Record<string, unknown>, msg: string) => Promise<boolean>;
}) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <CardShell title="Adena">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const a = Number(amount);
          if (!Number.isFinite(a) || a <= 0) return;
          setBusy(true);
          const ok = await callAction(
            { action: "add-adena", charName: char.name, amount: a },
            `Adicionado ${a.toLocaleString("pt-BR")} adena`,
          );
          if (ok) setAmount("");
          setBusy(false);
        }}
      >
        <FieldRow>
          <NumberInput value={amount} onChange={setAmount} placeholder="quantidade" className="flex-1" />
          <ActionButton loading={busy} disabled={!amount}>
            Adicionar adena
          </ActionButton>
        </FieldRow>
      </form>
    </CardShell>
  );
}

function CardTeleport({
  char,
  callAction,
}: {
  char: AdminGmCharacter;
  callAction: (p: Record<string, unknown>, msg: string) => Promise<boolean>;
}) {
  const [x, setX] = useState("");
  const [y, setY] = useState("");
  const [z, setZ] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <CardShell title="Teleporte">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const xn = Number(x);
          const yn = Number(y);
          const zn = Number(z);
          if (!Number.isFinite(xn) || !Number.isFinite(yn) || !Number.isFinite(zn))
            return;
          setBusy(true);
          await callAction(
            { action: "teleport", charName: char.name, x: xn, y: yn, z: zn },
            `Teleportado para (${xn}, ${yn}, ${zn})`,
          );
          setBusy(false);
        }}
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {TELEPORT_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                setX(String(p.x));
                setY(String(p.y));
                setZ(String(p.z));
              }}
              className="rounded border border-white/10 px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-white/75 transition hover:bg-white/5 hover:text-white"
            >
              {p.name}
            </button>
          ))}
        </div>
        <FieldRow>
          <NumberInput value={x} onChange={setX} placeholder="X" className="w-24" />
          <NumberInput value={y} onChange={setY} placeholder="Y" className="w-24" />
          <NumberInput value={z} onChange={setZ} placeholder="Z" className="w-24" />
          <ActionButton loading={busy} disabled={!x || !y || !z}>
            Teleportar
          </ActionButton>
        </FieldRow>
      </form>
    </CardShell>
  );
}

function CardAdmin({
  char,
  callAction,
}: {
  char: AdminGmCharacter;
  callAction: (p: Record<string, unknown>, msg: string) => Promise<boolean>;
}) {
  const [level, setLevel] = useState("0");
  const [busy, setBusy] = useState(false);
  return (
    <CardShell title="Acesso da conta (access_level)">
      <p className="mb-3 text-xs text-white/55">
        Aplica em <strong className="text-white">{char.account}</strong>: 100=GM, 0=normal, -100=banido.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const n = Number(level);
          setBusy(true);
          await callAction(
            { action: "set-access-level", login: char.account, level: n },
            `Access level definido como ${n}`,
          );
          setBusy(false);
        }}
      >
        <FieldRow>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none"
          >
            <option value="100">100 — GM</option>
            <option value="0">0 — Normal</option>
            <option value="-100">-100 — Banido</option>
          </select>
          <ActionButton loading={busy}>Alterar acesso</ActionButton>
        </FieldRow>
      </form>
    </CardShell>
  );
}

function CardName({
  char,
  callAction,
}: {
  char: AdminGmCharacter;
  callAction: (p: Record<string, unknown>, msg: string) => Promise<boolean>;
}) {
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <CardShell title="Nome">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          setBusy(true);
          const ok = await callAction(
            { action: "set-name", charId: char.charId, newName: newName.trim() },
            `Renomeado para ${newName}`,
          );
          if (ok) setNewName("");
          setBusy(false);
        }}
      >
        <FieldRow>
          <input
            type="text"
            value={newName}
            onChange={(e) =>
              setNewName(e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))
            }
            maxLength={35}
            placeholder="Novo nome"
            className="flex-1 rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 font-mono text-sm text-white focus:border-l2-gold focus:outline-none"
          />
          <ActionButton loading={busy} disabled={!newName.trim()}>
            Renomear
          </ActionButton>
        </FieldRow>
      </form>
    </CardShell>
  );
}
