import { prisma } from "@/lib/db";
import { CreateAnnouncementForm } from "@/components/admin/CreateAnnouncementForm";
import { AnnouncementActions } from "@/components/admin/AnnouncementActions";

export default async function AdminAnnouncementsPage() {
  const list = await prisma.announcement.findMany({
    orderBy: { publishedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      content: true,
      publishedAt: true,
      archivedAt: true,
    },
  });

  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Anúncios
      </h1>

      <section className="mb-8 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-white">
          Novo anúncio
        </h2>
        <CreateAnnouncementForm />
      </section>

      <section className="overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <div className="border-b border-white/5 px-6 py-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            Anúncios ({list.length})
          </h2>
        </div>
        {list.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/55">
            Nenhum anúncio criado.
          </div>
        ) : (
          <ul>
            {list.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-4 border-b border-white/5 px-6 py-4 last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                      {a.title}
                    </h3>
                    {a.archivedAt && (
                      <span className="rounded-full bg-white/8 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/55">
                        arquivado
                      </span>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-white/65">
                    {a.content}
                  </p>
                  <p className="mt-2 text-[10px] text-white/45">
                    Publicado {new Date(a.publishedAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <AnnouncementActions
                  id={a.id}
                  archived={a.archivedAt !== null}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
