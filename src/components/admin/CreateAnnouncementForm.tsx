"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export function CreateAnnouncementForm() {
  const router = useRouter();
  const { show } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [shoutInGame, setShoutInGame] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        show(data.error ?? "Falha", "error");
        return;
      }

      // Shout in-game: enfileira announcement_broadcast na fila GM DEPOIS
      // de salvar no site. Exige PIN GM desbloqueado (mesmo gate do Console
      // GM) — se estiver travado, o anúncio já foi salvo e avisamos.
      if (shoutInGame) {
        try {
          const gmRes = await fetch("/api/admin/gm-commands", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "announcement_broadcast",
              payload: {
                title: title.trim().slice(0, 80),
                message: content.trim().slice(0, 500),
                persistOnSite: true,
              },
            }),
          });
          const gmData = (await gmRes.json().catch(() => ({}))) as {
            error?: string;
            code?: string;
          };
          if (!gmRes.ok) {
            show(
              gmData.code === "pin_required"
                ? "[!] Anúncio salvo no site, mas o shout in-game NÃO foi enviado — desbloqueie o PIN GM (Console GM) e reenvie por lá"
                : `[!] Anúncio salvo no site, mas o shout in-game falhou: ${gmData.error ?? "erro"}`,
              "error",
            );
          } else {
            show(
              "[OK] Anúncio publicado no site + shout in-game enfileirado",
              "success",
            );
          }
        } catch {
          show(
            "[!] Anúncio salvo no site, mas o shout in-game falhou (rede)",
            "error",
          );
        }
      } else {
        show("Anúncio publicado", "success");
      }

      setTitle("");
      setContent("");
      setShoutInGame(false);
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        placeholder="Título"
        required
        className="rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="Conteúdo (Markdown leve aceito — quebras de linha são preservadas)"
        required
        className="resize-y rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none"
      />
      <label className="flex cursor-pointer items-start gap-2 text-xs text-white/75">
        <input
          type="checkbox"
          checked={shoutInGame}
          onChange={(e) => setShoutInGame(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#c0392b]"
        />
        <span>
          Também fazer shout in-game (jogadores online veem)
          <span className="block text-[10px] text-white/45">
            Se o servidor estiver online, os jogadores recebem imediatamente.
            Requer PIN GM desbloqueado (o mesmo do Console GM).
          </span>
        </span>
      </label>
      <div>
        <button
          type="submit"
          disabled={busy || !title.trim() || !content.trim()}
          className="rounded-md px-5 py-2 font-display text-xs font-bold uppercase tracking-wider text-black disabled:opacity-50"
          style={{ background: "var(--l2-gold-gradient)" }}
        >
          {busy ? "Publicando..." : "Publicar"}
        </button>
      </div>
    </form>
  );
}
