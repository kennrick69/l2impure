import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HopZoneBanner } from "@/components/HopZoneBanner";

type DownloadCard = {
  label: string;
  badge?: "recommended" | "torrent" | "patch";
  size: string;
  description: string;
  /** null = ainda não hospedado → card mostra "disponível no beta" */
  href: string | null;
  mirrors?: { label: string; href: string }[];
};

// Substituir por URLs reais (mirrors, magnet) quando os arquivos estiverem
// hospedados (R2/Drive/MEGA + torrent). href: null renderiza o estado
// "disponível no beta" com CTA de registro.
const DOWNLOADS: DownloadCard[] = [
  {
    label: "Cliente Interlude — Pack Completo",
    badge: "recommended",
    size: "~5.1 GB",
    description:
      "Cliente completo já com todos os arquivos do servidor. Ideal pra quem nunca jogou Interlude antes.",
    href: null,
  },
  {
    label: "Patch L2 Impure",
    badge: "patch",
    size: "~120 MB",
    description:
      "Apenas os arquivos modificados — copie sobre um cliente Interlude oficial existente.",
    href: null,
  },
  {
    label: "Torrent (magnet)",
    badge: "torrent",
    size: "~5.1 GB",
    description:
      "Mais rápido se vários estão baixando. Use qBittorrent ou Transmission.",
    href: null,
  },
];

const STEPS = [
  {
    n: 1,
    title: "Baixar",
    text: "Pegue o pack completo (recomendado) ou aplique o patch sobre um cliente Interlude existente.",
  },
  {
    n: 2,
    title: "Extrair",
    text: "Descompacte com WinRAR/7zip. O cliente fica numa pasta tipo C:\\L2Impure.",
  },
  {
    n: 3,
    title: "Cadastrar conta",
    text: 'No painel, clique "Criar conta no jogo" e escolha login + senha pra entrar.',
  },
  {
    n: 4,
    title: "Jogar",
    text: 'Rode "L2.exe" da pasta "system" e logue com a conta criada.',
  },
];

const REQUIREMENTS = [
  { label: "SO", value: "Windows 7 ou superior" },
  { label: "CPU", value: "Dual-core 2.4 GHz+" },
  { label: "RAM", value: "4 GB" },
  { label: "GPU", value: "DirectX 9 compatível" },
  { label: "Disco", value: "~10 GB livres" },
];

export default function DownloadPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative py-16 md:py-24">
          <div className="l2-container">
            <div className="mb-10 max-w-2xl">
              <span className="font-display text-[10px] font-semibold uppercase tracking-[2px] text-l2-gold">
                ⬇ Cliente
              </span>
              <h1
                className="mt-3 font-display uppercase tracking-[2px] text-white"
                style={{
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  fontWeight: 700,
                  lineHeight: 1.1,
                }}
              >
                Baixe o Cliente
              </h1>
              <p className="mt-4 text-base text-white/65">
                Cliente Interlude com o patch L2 Impure já aplicado. Escolha
                a opção que combina com sua conexão.
              </p>
              <div className="mt-6 rounded-xl border border-l2-gold/30 bg-l2-gold/5 p-5">
                <p className="font-display text-sm font-bold uppercase tracking-wider text-l2-gold">
                  ⏳ Client disponível no beta aberto
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/75">
                  O download é liberado junto com o beta aberto, semanas antes
                  do launch de outubro.{" "}
                  <Link href="/register" className="underline text-l2-gold">
                    Crie sua conta grátis
                  </Link>{" "}
                  pra ser avisado por email no dia — e já garantir o título
                  permanente de Fundador. Todo arquivo será publicado com
                  checksum SHA-256 pra você conferir a integridade.
                </p>
              </div>
            </div>

            {/* Cards de download */}
            <div className="mb-14 grid gap-5 lg:grid-cols-3">
              {DOWNLOADS.map((d) => (
                <DownloadCardView key={d.label} card={d} />
              ))}
            </div>

            {/* Passos */}
            <div className="mb-14">
              <h2 className="mb-5 font-display text-lg font-bold uppercase tracking-wider text-white">
                Como instalar
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {STEPS.map((s) => (
                  <div
                    key={s.n}
                    className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-5"
                  >
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full font-display text-xs font-bold text-black"
                      style={{ background: "var(--l2-gold-gradient)" }}
                    >
                      {s.n}
                    </div>
                    <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
                      {s.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-white/65">
                      {s.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Requisitos + ajuda */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
                <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-white">
                  Requisitos mínimos
                </h2>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {REQUIREMENTS.map((r) => (
                    <div key={r.label}>
                      <dt className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/45">
                        {r.label}
                      </dt>
                      <dd className="mt-0.5 text-sm text-white/85">
                        {r.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
                <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-white">
                  Problemas pra baixar ou instalar?
                </h2>
                <p className="mb-4 text-sm text-white/65">
                  A staff te ajuda no Discord oficial — tem canal de suporte
                  pra problemas de cliente, antivírus bloqueando, etc.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/support"
                    className="rounded-md border border-white/10 px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white/75 transition hover:bg-white/5 hover:text-white"
                  >
                    Página de suporte
                  </Link>
                  <a
                    href="https://discord.gg/pbGXNRuWVX"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-white transition hover:opacity-90"
                    style={{ backgroundColor: "rgb(var(--l2-discord))" }}
                  >
                    <span>Discord</span>
                    <span aria-hidden>→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <HopZoneBanner />
    </>
  );
}

function DownloadCardView({ card }: { card: DownloadCard }) {
  return (
    <article
      className={`rounded-xl border bg-[color:var(--l2-bg-card)] p-6 ${
        card.badge === "recommended"
          ? "border-l2-gold/40 shadow-[0_5px_25px_rgba(212,161,74,0.15)]"
          : "border-white/5"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-[10px] font-semibold uppercase tracking-[1.5px] text-white/45">
          {card.size}
        </span>
        {card.badge === "recommended" && (
          <span className="rounded-full bg-l2-gold/15 px-2.5 py-0.5 font-display text-[9px] font-semibold uppercase tracking-wider text-l2-gold">
            recomendado
          </span>
        )}
        {card.badge === "torrent" && (
          <span className="rounded-full bg-white/8 px-2.5 py-0.5 font-display text-[9px] font-semibold uppercase tracking-wider text-white/65">
            torrent
          </span>
        )}
        {card.badge === "patch" && (
          <span className="rounded-full bg-white/8 px-2.5 py-0.5 font-display text-[9px] font-semibold uppercase tracking-wider text-white/65">
            patch
          </span>
        )}
      </div>
      <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
        {card.label}
      </h3>
      <p className="mt-2 text-sm text-white/65">{card.description}</p>
      {card.href ? (
        <a
          href={card.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90"
          style={{ background: "var(--l2-gold-gradient)" }}
        >
          <span>⬇</span>
          <span>
            {card.badge === "torrent" ? "Abrir magnet" : "Baixar agora"}
          </span>
        </a>
      ) : (
        <span className="mt-5 inline-flex w-full cursor-default items-center justify-center gap-2 rounded-md border border-white/15 px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white/50">
          <span>⏳</span>
          <span>Disponível no beta aberto</span>
        </span>
      )}
      {card.mirrors && card.mirrors.length > 0 && (
        <div className="mt-4 border-t border-white/5 pt-4">
          <div className="mb-2 font-display text-[10px] font-semibold uppercase tracking-wider text-white/45">
            Mirrors alternativos
          </div>
          <ul className="flex flex-col gap-1.5">
            {card.mirrors.map((m) => (
              <li key={m.label}>
                <a
                  href={m.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/65 transition hover:text-white"
                >
                  → {m.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
