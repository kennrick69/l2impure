import Link from "next/link";
import { bridge, type NpcMetadata } from "@/lib/bridge";
import { NpcDetailView } from "@/components/admin/NpcDetailView";

export default async function AdminNpcDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: raw } = await params;
  const npcId = Number(raw);
  if (!Number.isFinite(npcId) || npcId <= 0) {
    return (
      <div className="rounded-md border border-l2-red/40 bg-l2-red/5 px-4 py-3 text-sm text-l2-red">
        ID inválido
      </div>
    );
  }

  // Tenta achar metadata no JSON do server (read-time, sem cache cliente)
  let template: NpcMetadata | null = null;
  let error: string | null = null;
  try {
    const all = await bridge.gm.getNpcsMetadata();
    template = all.find((n) => n.id === npcId) ?? null;
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <>
      <Link
        href="/admin/npcs"
        className="mb-4 inline-block font-display text-[10px] font-semibold uppercase tracking-wider text-white/55 transition hover:text-white"
      >
        ← Voltar pra lista
      </Link>
      {error ? (
        <div className="rounded-md border border-l2-red/40 bg-l2-red/5 px-4 py-3 text-sm text-l2-red">
          Bridge falhou: {error}
        </div>
      ) : !template ? (
        <div className="rounded-md border border-white/10 px-4 py-3 text-sm text-white/65">
          NPC #{npcId} não encontrado no índice. Re-rodar parser na bridge
          se foi adicionado recentemente.
        </div>
      ) : (
        <NpcDetailView template={template} />
      )}
    </>
  );
}
