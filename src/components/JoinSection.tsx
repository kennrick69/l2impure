"use client";

import { joinSection } from "@/lib/l2impure-data";
import { usePlayModal } from "./PlayModal";

export function JoinSection() {
  const { open } = usePlayModal();

  return (
    <section className="relative isolate overflow-hidden py-24 md:py-32">
      <div className="absolute inset-0 -z-10">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
        >
          <source src="/videos/join.mp4" type="video/mp4" />
        </video>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,10,15,0.9) 0%, rgba(10,10,15,0.55) 40%, rgba(10,10,15,0.9) 100%)",
          }}
        />
      </div>

      <div className="l2-container relative z-10 mx-auto max-w-[900px] text-center">
        <h3
          className="font-display text-[color:var(--l2-text-gold)]"
          style={{
            fontSize: "clamp(1.25rem, 2vw, 1.75rem)",
            fontWeight: 600,
            letterSpacing: "4px",
            textTransform: "uppercase",
            textShadow: "0 2px 15px rgba(0,0,0,0.9)",
            margin: 0,
          }}
        >
          {joinSection.subtitle}
        </h3>
        <h2
          className="mt-1 font-display font-bold uppercase text-white"
          style={{
            fontSize: "clamp(2.5rem, 6vw, 5rem)",
            letterSpacing: "2px",
            lineHeight: 1,
            textShadow: "0 4px 25px rgba(0,0,0,0.95)",
          }}
        >
          {joinSection.title}
        </h2>
        <p
          className="mx-auto mt-6 max-w-[700px] text-white/85"
          style={{
            fontSize: "clamp(0.95rem, 1.2vw, 1.15rem)",
            lineHeight: 1.6,
            textShadow: "0 1px 10px rgba(0,0,0,0.85)",
          }}
        >
          {joinSection.text}
        </p>
        <button
          type="button"
          onClick={open}
          className="mt-10 inline-flex items-center justify-center rounded-md px-10 py-4 font-display text-sm font-bold uppercase tracking-[2px] text-black shadow-[var(--l2-shadow-gold)] transition hover:brightness-110 md:text-base"
          style={{ background: "var(--l2-gold-gradient)" }}
        >
          {joinSection.cta}
        </button>
      </div>
    </section>
  );
}
