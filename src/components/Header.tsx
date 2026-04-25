"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GlobeIcon } from "./icons";
import { navItems, languages } from "@/lib/l2impure-data";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [burgerOpen, setBurgerOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className="l2-header fixed inset-x-0 top-0 z-40 h-[100px] md:h-[120px]"
        data-scrolled={scrolled ? "true" : "false"}
      >
        <div className="l2-container flex h-full items-center gap-6">
          <Link href="/" className="flex items-center" aria-label="L2 Impure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo.png"
              alt="L2 Impure"
              className="h-[72px] w-auto select-none md:h-[100px]"
              draggable={false}
            />
          </Link>

          <nav className="hidden flex-1 lg:block">
            <ul className="flex items-center">
              {navItems.map((item) => (
                <li key={item.label} className="l2-nav-item">
                  {item.dropdown ? (
                    <div className="l2-nav-link flex cursor-pointer items-center gap-1.5 px-4 py-6 font-display text-[12px] font-semibold uppercase tracking-wider text-white/70 transition hover:text-white">
                      {item.label}
                      <span className="l2-arrow" />
                    </div>
                  ) : (
                    <a
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      className="flex px-4 py-6 font-display text-[12px] font-semibold uppercase tracking-wider text-white/70 transition hover:text-white"
                    >
                      {item.label}
                    </a>
                  )}
                  {item.dropdown && (
                    <div className="l2-dropdown">
                      <ul>
                        {item.dropdown.map((d) => (
                          <li key={d.label}>
                            <a
                              href={d.href}
                              target={d.external ? "_blank" : undefined}
                              rel={
                                d.external
                                  ? "noopener noreferrer"
                                  : undefined
                              }
                            >
                              {d.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <a
              href="/pages/login.html"
              className="hidden font-display text-[12px] font-semibold uppercase tracking-wider text-white/80 transition hover:text-white md:inline-block"
            >
              Entrar
            </a>

            <div className="l2-nav-item hidden md:block">
              <button
                type="button"
                className="l2-nav-link flex cursor-pointer items-center gap-1.5 rounded px-3 py-2 font-display text-[12px] font-semibold uppercase tracking-wider text-white/70 transition hover:text-white"
              >
                <GlobeIcon className="h-4 w-4" />
                Português
                <span className="l2-arrow" />
              </button>
              <div className="l2-dropdown" style={{ right: 0, left: "auto" }}>
                <ul>
                  {languages.map((lang) => (
                    <li key={lang.code}>
                      <a href={`#${lang.code}`}>{lang.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              aria-label="Abrir menu"
              className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] lg:hidden"
              onClick={() => setBurgerOpen(true)}
            >
              <span className="block h-[2px] w-6 bg-white" />
              <span className="block h-[2px] w-6 bg-white" />
              <span className="block h-[2px] w-6 bg-white" />
            </button>
          </div>
        </div>
      </header>

      {burgerOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[color:var(--l2-bg-primary)]/98 lg:hidden">
          <div className="flex items-center justify-between px-6 py-5">
            <Link href="/" onClick={() => setBurgerOpen(false)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo.png"
                alt="L2 Impure"
                className="h-16 w-auto"
              />
            </Link>
            <button
              aria-label="Fechar menu"
              onClick={() => setBurgerOpen(false)}
              className="h-10 w-10 text-xl text-white"
            >
              ✕
            </button>
          </div>
          <nav className="px-8 pt-4 pb-12">
            <ul className="flex flex-col gap-6">
              {navItems.map((item) => (
                <li key={item.label}>
                  <div className="font-display text-xl font-semibold uppercase tracking-wider text-white">
                    {item.label}
                  </div>
                  {item.dropdown && (
                    <ul className="mt-3 flex flex-col gap-2 pl-4">
                      {item.dropdown.map((d) => (
                        <li key={d.label}>
                          <a
                            href={d.href}
                            target={d.external ? "_blank" : undefined}
                            rel={d.external ? "noopener noreferrer" : undefined}
                            className="font-display text-sm uppercase tracking-wider text-white/70 hover:text-white"
                          >
                            {d.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              <li className="mt-6 border-t border-white/10 pt-6">
                <a
                  href="/pages/login.html"
                  className="font-display text-xl font-semibold uppercase tracking-wider text-white"
                >
                  Entrar
                </a>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
