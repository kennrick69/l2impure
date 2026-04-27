import Link from "next/link";
import { ToastProvider } from "@/components/ui/Toast";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <section className="flex flex-1 flex-col bg-[color:var(--l2-bg-secondary)] px-6 py-10 lg:px-16 lg:py-14">
          <Link href="/" className="mb-8 inline-flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo.png"
              alt="L2 Impure"
              className="h-[136px] w-auto"
            />
          </Link>
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
            {children}
          </div>
          <footer className="mt-8 text-center text-xs text-white/35">
            © 2026 L2 Impure
          </footer>
        </section>

        <aside className="relative isolate hidden overflow-hidden lg:block lg:w-1/2">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          >
            <source src="/videos/header.mp4" type="video/mp4" />
          </video>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(10,10,15,0.7) 0%, rgba(10,10,15,0.4) 50%, rgba(212,161,74,0.15) 100%)",
            }}
          />
          <div className="relative flex h-full flex-col items-center justify-center px-10 text-center">
            <h2
              className="font-display uppercase tracking-[3px] text-white"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                fontWeight: 700,
                textShadow: "0 4px 20px rgba(0,0,0,0.9)",
                lineHeight: 1.1,
              }}
            >
              INTERLUDE
              <br />
              <span style={{ color: "rgb(var(--l2-gold))" }}>X10</span>
            </h2>
            <p className="mt-6 max-w-md text-sm text-white/85" style={{ textShadow: "0 1px 10px rgba(0,0,0,0.85)" }}>
              Servidor brasileiro de Lineage 2 Interlude. Auto-Farm, Olympiad e eventos 24/7. Beta aberto — junte-se à comunidade.
            </p>
          </div>
        </aside>
      </div>
    </ToastProvider>
  );
}
