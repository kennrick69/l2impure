"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export function ReferralLinkCopy({
  url,
  code,
}: {
  url: string;
  code: string;
}) {
  const { show } = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      show("Link copiado!", "success");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      show("Não consegui copiar — selecione o texto manualmente", "error");
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-3 rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-4 py-2.5">
        <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/45">
          Código
        </span>
        <span className="font-display font-bold uppercase tracking-wider text-l2-gold">
          {code}
        </span>
        <span className="ml-auto truncate font-mono text-xs text-white/65">
          {url}
        </span>
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90"
        style={{ background: "var(--l2-gold-gradient)" }}
      >
        <span>{copied ? "✓" : "📋"}</span>
        <span>{copied ? "Copiado" : "Copiar link"}</span>
      </button>
    </div>
  );
}
