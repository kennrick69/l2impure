"use client";

import { PlayIcon } from "./icons";
import { usePlayModal } from "./PlayModal";
import { heroContent } from "@/lib/l2impure-data";

export function Hero() {
  const { open } = usePlayModal();

  return (
    <section className="relative isolate flex min-h-[720px] items-center overflow-hidden pt-[100px] md:min-h-[800px] md:pt-[120px]">
      <div className="absolute inset-0 -z-10">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
        >
          <source src="/videos/header.mp4" type="video/mp4" />
        </video>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,10,15,0.65) 0%, rgba(10,10,15,0.4) 40%, rgba(10,10,15,0.85) 80%, var(--l2-bg-primary) 100%)",
          }}
        />
      </div>

      <div className="l2-container relative z-10 py-16 md:py-20">
        <div className="max-w-[680px]">
          <h1
            className="font-display font-bold uppercase text-white"
            style={{
              fontSize: "clamp(3rem, 7vw, 5.5rem)",
              letterSpacing: "2px",
              lineHeight: 1,
              textShadow: "0 2px 20px rgba(0,0,0,0.85)",
              margin: 0,
            }}
          >
            {heroContent.title}
          </h1>
          <h2
            className="mt-2 font-display uppercase"
            style={{
              fontSize: "clamp(1.75rem, 4vw, 3rem)",
              fontWeight: 600,
              letterSpacing: "3px",
              color: "rgb(var(--l2-gold))",
              textShadow: "0 2px 15px rgba(0,0,0,0.9)",
            }}
          >
            {heroContent.subtitle}
          </h2>

          <div
            className="mt-6 space-y-2 font-display uppercase tracking-wide"
            style={{
              fontSize: "clamp(0.9rem, 1.1vw, 1.1rem)",
              color: "rgba(255,255,255,0.85)",
              textShadow: "0 1px 8px rgba(0,0,0,0.85)",
            }}
          >
            {heroContent.features.map((f) => (
              <p key={f}>{f}</p>
            ))}
          </div>

          <button
            onClick={open}
            className="mt-10 inline-flex items-center gap-4 rounded-md border-[3px] border-white/40 px-8 py-4 transition hover:border-[color:var(--l2-text-gold)] hover:bg-white/5"
          >
            <PlayIcon
              className="h-10 w-10 shrink-0"
              style={{ color: "rgb(var(--l2-gold))" }}
            />
            <span className="flex flex-col items-start">
              <span className="font-display text-xl font-bold uppercase tracking-[2px] text-white md:text-2xl">
                {heroContent.ctaTitle}
              </span>
              <span className="font-display text-[11px] font-semibold uppercase tracking-[2px] text-white/70 md:text-xs">
                {heroContent.ctaSubtitle}
              </span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
