"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export type SecretDto = {
  key: string;
  category: string;
  label: string;
  description: string;
  isSet: boolean;
  decryptError: boolean;
  maskedValue: string;
  required: boolean;
  envFallback: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  mercadopago: "Mercado Pago",
  smtp: "SMTP",
  recaptcha: "reCAPTCHA",
  general: "Geral",
};

export function SecretsManager({
  initialSecrets,
}: {
  initialSecrets: SecretDto[];
}) {
  const [secrets, setSecrets] = useState(initialSecrets);

  const categories: string[] = [];
  for (const s of secrets) {
    if (!categories.includes(s.category)) categories.push(s.category);
  }

  return (
    <div className="flex flex-col gap-8">
      {categories.map((cat) => (
        <CategoryCard
          key={cat}
          category={cat}
          secrets={secrets.filter((s) => s.category === cat)}
          onSaved={(key, isSet, maskedValue) =>
            setSecrets((prev) =>
              prev.map((s) =>
                s.key === key
                  ? {
                      ...s,
                      isSet,
                      maskedValue,
                      decryptError: false,
                      updatedAt: new Date().toISOString(),
                    }
                  : s,
              ),
            )
          }
        />
      ))}
    </div>
  );
}

function CategoryCard({
  category,
  secrets,
  onSaved,
}: {
  category: string;
  secrets: SecretDto[];
  onSaved: (key: string, isSet: boolean, maskedValue: string) => void;
}) {
  const { show } = useToast();
  const [testing, setTesting] = useState(false);
  const isMp = category === "mercadopago";

  async function testMp() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/secrets/mp/test", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        nickname?: string | null;
        accountId?: unknown;
        siteId?: string | null;
      };
      if (data.ok) {
        show(
          `[OK] Credencial válida — conta ${data.nickname ?? data.accountId ?? "?"} (${data.siteId ?? "?"})`,
          "success",
        );
      } else {
        show(`[ERRO] ${data.error ?? "Teste falhou"}`, "error");
      }
    } catch {
      show("[ERRO] Erro de rede no teste", "error");
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="rounded-lg border border-white/10 bg-[color:var(--l2-bg-card)]/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-[1.5px] text-l2-red">
          {CATEGORY_LABELS[category] ?? category}
        </h2>
        {isMp && (
          <button
            type="button"
            onClick={testMp}
            disabled={testing}
            className="rounded-md border border-white/15 px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-wider text-white/75 transition hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {testing ? "Testando..." : "Testar credenciais"}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-4">
        {secrets.map((s) => (
          <SecretRow key={s.key} secret={s} onSaved={onSaved} />
        ))}
      </div>
    </section>
  );
}

function SecretRow({
  secret,
  onSaved,
}: {
  secret: SecretDto;
  onSaved: (key: string, isSet: boolean, maskedValue: string) => void;
}) {
  const { show } = useToast();
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!value.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/secrets/${encodeURIComponent(secret.key)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: value.trim() }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        code?: string;
        isSet?: boolean;
        maskedValue?: string;
      };
      if (!res.ok) {
        show(`[ERRO] ${data.error ?? "Falha ao salvar"}`, "error");
        return;
      }
      onSaved(secret.key, Boolean(data.isSet), data.maskedValue ?? "");
      setValue("");
      setVisible(false);
      show(`[OK] ${secret.label} salvo (vale em até 30s)`, "success");
    } catch {
      show("[ERRO] Erro de rede", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-white/8 bg-black/20 p-4">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-white">
          {secret.label}
        </span>
        <code className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/45">
          {secret.key}
        </code>
        {secret.isSet ? (
          <span className="rounded-md border border-l2-green/40 bg-l2-green/10 px-2 py-0.5 text-[10px] font-semibold text-l2-green">
            [OK] Configurado
          </span>
        ) : (
          <span
            className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
              secret.required
                ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
                : "border-white/15 bg-white/5 text-white/50"
            }`}
          >
            {secret.required ? "[ATENÇÃO] Vazio — obrigatório" : "Vazio"}
          </span>
        )}
        {secret.decryptError && (
          <span className="rounded-md border border-l2-red/50 bg-l2-red/10 px-2 py-0.5 text-[10px] font-semibold text-l2-red">
            [ERRO] Decrypt falhou — recole o valor (JWT_SECRET mudou?)
          </span>
        )}
      </div>
      <p className="mb-3 max-w-2xl text-xs text-white/50">{secret.description}</p>
      {secret.key === "mp.webhook_secret" && !secret.isSet && (
        <p className="mb-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
          [ATENÇÃO] Configure antes de aceitar pagamentos — sem esse secret o
          webhook responde 503 e nenhuma recarga é creditada.
        </p>
      )}
      {secret.isSet && (
        <p className="mb-2 text-[11px] text-white/40">
          Valor atual: <code className="text-white/60">{secret.maskedValue}</code>
          {" · "}atualizado{" "}
          {new Date(secret.updatedAt).toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          })}
          {secret.updatedBy ? ` por ${secret.updatedBy}` : ""}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={secret.isSet ? "Novo valor (substitui o atual)" : "Colar valor"}
          autoComplete="off"
          spellCheck={false}
          className="w-full max-w-md rounded-md border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs text-white placeholder:text-white/30 focus:border-l2-red/60 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="rounded-md border border-white/15 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/60 transition hover:text-white"
          title={visible ? "Esconder" : "Mostrar"}
        >
          {visible ? "Esconder" : "Mostrar"}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy || !value.trim()}
          className="rounded-md px-4 py-2 font-display text-[10px] font-bold uppercase tracking-wider text-black transition disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "var(--l2-gold-gradient)" }}
        >
          {busy ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
