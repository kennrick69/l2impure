import { PageTitle } from "@/components/dashboard/Placeholder";
import { PromoCodeForm } from "@/components/dashboard/PromoCodeForm";

export default function PromoCodePage() {
  return (
    <>
      <PageTitle
        title="Código promocional"
        subtitle="Resgate códigos de eventos, redes sociais e parceiros."
      />

      <PromoCodeForm />

      <section className="mt-6 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-white/85">
          Onde achar códigos?
        </h3>
        <ul className="ml-1 flex flex-col gap-1.5 text-xs text-white/55">
          <li>· Discord oficial — anúncios e canais de promoções</li>
          <li>· Redes sociais (Instagram, YouTube)</li>
          <li>· Eventos e parceiros do servidor</li>
        </ul>
      </section>
    </>
  );
}
