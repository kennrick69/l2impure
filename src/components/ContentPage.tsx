import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HopZoneBanner } from "@/components/HopZoneBanner";

/**
 * Shell padrão das páginas públicas de conteúdo (hibridos, faq, regras,
 * roadmap, sobre, termos, privacidade). Header fixo + hero de título +
 * corpo + footer.
 */
export function ContentPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative py-16 md:py-24">
          <div className="l2-container">
            <div className="mb-12 max-w-3xl">
              <span className="font-display text-[10px] font-semibold uppercase tracking-[2px] text-l2-gold">
                {eyebrow}
              </span>
              <h1
                className="mt-3 font-display uppercase tracking-[2px] text-white"
                style={{
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  fontWeight: 700,
                  lineHeight: 1.1,
                }}
              >
                {title}
              </h1>
              {intro && (
                <p className="mt-4 text-base leading-relaxed text-white/65">
                  {intro}
                </p>
              )}
            </div>
            {children}
          </div>
        </section>
      </main>
      <Footer />
      <HopZoneBanner />
    </>
  );
}

export function ContentCard({
  title,
  icon,
  highlight,
  children,
}: {
  title?: string;
  icon?: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-6 ${
        highlight
          ? "border-l2-gold/40 bg-l2-gold/5 shadow-[0_5px_25px_rgba(212,161,74,0.12)]"
          : "border-white/5 bg-[color:var(--l2-bg-card)]"
      }`}
    >
      {title && (
        <h2 className="mb-3 font-display text-base font-bold uppercase tracking-wider text-white">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </h2>
      )}
      <div className="space-y-3 text-sm leading-relaxed text-white/75">
        {children}
      </div>
    </div>
  );
}
