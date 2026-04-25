import { featureCards } from "@/lib/l2impure-data";

export function FeaturesSection() {
  return (
    <section className="relative py-14 md:py-20">
      <div className="l2-container-wide">
        <h2
          className="mb-10 text-center font-display font-bold uppercase text-white md:mb-14"
          style={{
            fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
            letterSpacing: "1px",
          }}
        >
          Por que jogar no{" "}
          <span className="l2-gold-gradient-text">L2 Impure?</span>
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((f) => (
            <div
              key={f.title}
              className={`relative overflow-hidden rounded-xl border p-6 transition hover:-translate-y-1 hover:shadow-[var(--l2-shadow-lg)] ${
                f.highlight
                  ? "border-[color:var(--l2-border-gold)] bg-[color:var(--l2-bg-card)]"
                  : "border-white/5 bg-[color:var(--l2-bg-card)]"
              }`}
            >
              {f.highlight && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{ background: "var(--l2-gold-gradient)" }}
                />
              )}
              <div className="mb-4 text-3xl">{f.icon}</div>
              <h3 className="mb-2 font-display text-lg font-bold uppercase tracking-wide text-white">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/70">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
