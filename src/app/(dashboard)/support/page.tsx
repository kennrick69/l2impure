import { PageTitle } from "@/components/dashboard/Placeholder";
import { DiscordIcon } from "@/components/icons";
import { siteConfig } from "@/lib/l2impure-data";

const DISCORD_URL = siteConfig.discordUrl;

export default function SupportPage() {
  return (
    <>
      <PageTitle
        title="Suporte"
        subtitle="Tire dúvidas, relate problemas e fale com a equipe."
      />

      <div className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-8">
        <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgb(var(--l2-discord) / 0.95)" }}
          >
            <DiscordIcon className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="mb-2 font-display text-lg font-bold uppercase tracking-wider text-white">
              Fale com a gente no Discord
            </h2>
            <p className="text-sm text-white/65">
              Canal oficial pra tirar dúvidas, reportar bugs e acompanhar
              avisos da L2 Impure. A equipe responde direto por lá enquanto
              o sistema de tickets nativo não está pronto.
            </p>
          </div>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-md px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white transition hover:opacity-90"
            style={{ backgroundColor: "rgb(var(--l2-discord))" }}
          >
            <span>Entrar no Discord</span>
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-white/85">
          Sistema de tickets — em construção
        </h3>
        <p className="text-xs text-white/55">
          Histórico de chamados, anexos e SLA virão pra cá em breve. Por
          enquanto, todo suporte é pelo Discord.
        </p>
      </div>
    </>
  );
}
