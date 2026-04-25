import { GameMasterPanel } from "@/components/admin/GameMasterPanel";

export default function AdminGameMasterPage() {
  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Game master
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-white/55">
        Ferramentas de GM ligadas direto na bridge. Ações em personagem
        exigem que ele esteja offline — se logado, espera deslogar.
      </p>
      <GameMasterPanel />
    </>
  );
}
