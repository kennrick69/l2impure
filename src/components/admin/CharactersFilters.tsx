"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CLASS_OPTIONS } from "@/lib/l2j-classes";

const SORTS = [
  { v: "level", label: "Level" },
  { v: "char_name", label: "Nome" },
  { v: "pvpkills", label: "PvP" },
  { v: "pkkills", label: "PK" },
  { v: "online", label: "Online" },
];

export function CharactersFilters({
  initial,
}: {
  initial: {
    name?: string;
    levelMin?: string;
    levelMax?: string;
    classId?: string;
    online?: string;
    hasClan?: string;
    account?: string;
    sort?: string;
    dir?: string;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name ?? "");
  const [levelMin, setLevelMin] = useState(initial.levelMin ?? "");
  const [levelMax, setLevelMax] = useState(initial.levelMax ?? "");
  const [classId, setClassId] = useState(initial.classId ?? "");
  const [online, setOnline] = useState(initial.online ?? "");
  const [hasClan, setHasClan] = useState(initial.hasClan ?? "");
  const [account, setAccount] = useState(initial.account ?? "");
  const [sort, setSort] = useState(initial.sort ?? "level");
  const [dir, setDir] = useState(initial.dir ?? "desc");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const qs = new URLSearchParams();
    const set = (k: string, v: string) => v && qs.append(k, v);
    set("name", name);
    set("levelMin", levelMin);
    set("levelMax", levelMax);
    set("classId", classId);
    set("online", online);
    set("hasClan", hasClan);
    set("account", account);
    set("sort", sort);
    set("dir", dir);
    router.push(`/admin/characters?${qs.toString()}`);
  }

  function clear() {
    router.push("/admin/characters");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Nome contém">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: cloud"
            className="text-input"
          />
        </Field>
        <Field label="Conta">
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="ex: conta2"
            className="text-input"
          />
        </Field>
        <Field label="Level mín">
          <input
            type="number"
            value={levelMin}
            onChange={(e) => setLevelMin(e.target.value)}
            min={1}
            max={85}
            className="text-input"
          />
        </Field>
        <Field label="Level máx">
          <input
            type="number"
            value={levelMax}
            onChange={(e) => setLevelMax(e.target.value)}
            min={1}
            max={85}
            className="text-input"
          />
        </Field>
        <Field label="Classe">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="text-input"
          >
            <option value="">Todas</option>
            {CLASS_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Online">
          <select
            value={online}
            onChange={(e) => setOnline(e.target.value)}
            className="text-input"
          >
            <option value="">Qualquer</option>
            <option value="true">Online</option>
            <option value="false">Offline</option>
          </select>
        </Field>
        <Field label="Tem clã?">
          <select
            value={hasClan}
            onChange={(e) => setHasClan(e.target.value)}
            className="text-input"
          >
            <option value="">Qualquer</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        </Field>
        <Field label="Ordenar por">
          <div className="flex gap-1">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-input flex-1"
            >
              {SORTS.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={dir}
              onChange={(e) => setDir(e.target.value)}
              className="text-input w-20"
            >
              <option value="desc">↓</option>
              <option value="asc">↑</option>
            </select>
          </div>
        </Field>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="rounded-md px-5 py-2 font-display text-xs font-bold uppercase tracking-wider text-black"
          style={{ background: "var(--l2-gold-gradient)" }}
        >
          Aplicar filtros
        </button>
        <button
          type="button"
          onClick={clear}
          className="rounded-md border border-white/10 px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white/65 transition hover:bg-white/5 hover:text-white"
        >
          Limpar
        </button>
      </div>
      <style>{`
        .text-input {
          width: 100%;
          border-radius: 6px;
          border: 1px solid rgb(255 255 255 / 0.08);
          background: var(--l2-bg-input);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: white;
        }
        .text-input:focus {
          outline: none;
          border-color: rgb(0 200 83 / 0);
          box-shadow: none;
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/55">
      {label}
      {children}
    </label>
  );
}
