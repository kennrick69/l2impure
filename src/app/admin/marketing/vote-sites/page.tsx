import { prisma } from "@/lib/db";
import { VoteSitesManager } from "@/components/admin/VoteSitesManager";

export const dynamic = "force-dynamic";

export default async function AdminVoteSitesPage() {
  const sites = await prisma.voteSite.findMany({ orderBy: { id: "asc" } });

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Vote sites
      </h1>
      <p className="mb-6 max-w-3xl text-sm text-white/55">
        Rankings de divulgação (T-14 do plano de negócio). Cadastre o servidor
        em cada ranking, cole a callback URL lá, copie o server ID de volta pra
        cá e ative o toggle. A bridge lê essa config em até 5 minutos — sem
        deploy, sem restart.
      </p>
      <VoteSitesManager
        initialSites={sites.map((s) => ({
          id: s.id,
          slug: s.slug,
          displayName: s.displayName,
          serverId: s.serverId,
          callbackUrl: s.callbackUrl,
          callbackMethod: s.callbackMethod,
          active: s.active,
          cooldownHours: s.cooldownHours,
          rewardCoins: s.rewardCoins,
          rewardDescription: s.rewardDescription,
          notes: s.notes,
          updatedAt: s.updatedAt.toISOString(),
        }))}
      />
    </>
  );
}
