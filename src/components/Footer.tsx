import { siteConfig, footerColumns, footerLegal } from "@/lib/l2impure-data";

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-[color:var(--l2-bg-secondary)] py-14">
      <div className="l2-container-wide">
        <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
          <div>
            <div className="mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo.png"
                alt="L2 Impure"
                className="h-[90px] w-auto"
              />
            </div>
            <p className="max-w-sm text-sm text-white/60">
              {siteConfig.tagline}.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {footerColumns.map((col) => (
              <div key={col.heading}>
                <h4 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-white">
                  {col.heading}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="text-sm text-white/60 transition hover:text-white"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 md:flex-row">
          <p className="text-xs text-white/45">{siteConfig.copyright}</p>
          <div className="flex items-center gap-6 text-xs text-white/55">
            {footerLegal.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="transition hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
