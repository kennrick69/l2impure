import { prisma } from "@/lib/db";
import { EventConfigManager } from "@/components/admin/EventConfigManager";
import type { EventConfigDto } from "@/components/admin/EventConfigManager";
import { EVENT_ORDER } from "@/lib/event-config-catalog";

export const dynamic = "force-dynamic";

export default async function AdminEventConfigPage() {
  const rows = await prisma.eventConfig.findMany();
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const ordered = [
    ...EVENT_ORDER.map((slug) => bySlug.get(slug)).filter(
      (r): r is NonNullable<typeof r> => Boolean(r),
    ),
    ...rows.filter((r) => !EVENT_ORDER.includes(r.slug)),
  ];

  const events: EventConfigDto[] = ordered.map((e) => ({
    slug: e.slug,
    displayName: e.displayName,
    enabled: e.enabled,
    config: e.config as Record<string, number | boolean | string>,
    fileTarget: e.fileTarget,
    lastAppliedAt: e.lastAppliedAt ? e.lastAppliedAt.toISOString() : null,
    updatedAt: e.updatedAt.toISOString(),
  }));

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Eventos — Config
      </h1>
      <p className="mb-6 max-w-3xl text-sm text-white/55">
        Horários e regras dos eventos do gameserver, editáveis sem SSH.
        Todos os horários são em <strong className="text-white/80">horário de Brasília (BRT)</strong>.
        &quot;Aplicar&quot; grava no arquivo da VPS (com backup automático);
        as mudanças só valem no jogo depois do{" "}
        <strong className="text-white/80">reload do gameserver</strong>.
      </p>
      <EventConfigManager initialEvents={events} />
    </>
  );
}
