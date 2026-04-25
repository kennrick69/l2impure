import { DiscordIcon } from "./icons";

export function DiscordBanner() {
  return (
    <section className="relative py-10">
      <div className="l2-container">
        <div
          className="flex flex-col items-center gap-5 rounded-2xl border border-white/5 px-6 py-8 text-center md:flex-row md:text-left"
          style={{
            background:
              "linear-gradient(135deg, rgba(88,101,242,0.08) 0%, rgba(26,26,37,0.95) 50%, rgba(26,26,37,0.95) 100%)",
          }}
        >
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: "rgb(var(--l2-discord))" }}
          >
            <DiscordIcon className="h-9 w-9" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white md:text-xl">
              🦄 L2 Impure no Discord
            </h3>
            <p className="mt-1 text-sm text-white/65">
              Junte-se à comunidade, tire dúvidas e fique por dentro das
              novidades!
            </p>
          </div>
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg px-6 py-3 font-display text-sm font-semibold uppercase tracking-wider text-white transition hover:brightness-110"
            style={{ backgroundColor: "rgb(var(--l2-discord))" }}
          >
            Entrar no Discord
          </a>
        </div>
      </div>
    </section>
  );
}
