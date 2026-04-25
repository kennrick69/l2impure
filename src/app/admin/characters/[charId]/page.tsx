import Link from "next/link";
import { bridge, type AdminGmCharFullResponse } from "@/lib/bridge";
import { CharacterDetailView } from "@/components/admin/CharacterDetailView";

export default async function AdminCharacterDetailPage({
  params,
}: {
  params: Promise<{ charId: string }>;
}) {
  const { charId: raw } = await params;
  const charId = Number(raw);
  if (!Number.isFinite(charId) || charId <= 0) {
    return (
      <div className="rounded-md border border-l2-red/40 bg-l2-red/5 px-4 py-3 text-sm text-l2-red">
        charId inválido
      </div>
    );
  }

  let data: AdminGmCharFullResponse | null = null;
  let error: string | null = null;
  try {
    data = await bridge.gm.getCharacterFull(charId);
  } catch (e) {
    error = (e as Error).message;
  }

  if (error) {
    return (
      <>
        <Link
          href="/admin/characters"
          className="mb-4 inline-block font-display text-[10px] font-semibold uppercase tracking-wider text-white/55 transition hover:text-white"
        >
          ← Voltar
        </Link>
        <div className="rounded-md border border-l2-red/40 bg-l2-red/5 px-4 py-3 text-sm text-l2-red">
          Bridge falhou: {error}
        </div>
      </>
    );
  }
  if (!data) {
    return (
      <div className="rounded-md border border-white/10 px-4 py-3 text-sm text-white/65">
        Personagem não encontrado.
      </div>
    );
  }

  return (
    <>
      <Link
        href="/admin/characters"
        className="mb-4 inline-block font-display text-[10px] font-semibold uppercase tracking-wider text-white/55 transition hover:text-white"
      >
        ← Voltar pra lista
      </Link>
      <CharacterDetailView char={data.char} inventory={data.inventory} />
    </>
  );
}
