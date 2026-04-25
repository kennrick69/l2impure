import { ItemSearchPanel } from "@/components/admin/ItemSearchPanel";

export default function AdminItemsPage() {
  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Items — busca global
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-white/55">
        Encontre quem tem um item no servidor. Selecione no catálogo (ou
        digite ID) e veja todos os owners com count + enchant.
      </p>
      <ItemSearchPanel />
    </>
  );
}
