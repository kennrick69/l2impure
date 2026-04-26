import { NpcBrowser } from "@/components/admin/NpcBrowser";

export default function AdminNpcsPage() {
  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        NPCs do servidor
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-white/55">
        6.4k+ NPCs do fork. Filtre por nome/título/level/tipo. Click pra
        abrir o detalhe e editar.
      </p>
      <NpcBrowser />
    </>
  );
}
