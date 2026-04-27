import Link from "next/link";
import { requireAdminOrRedirect } from "@/lib/admin";
import { ToastProvider } from "@/components/ui/Toast";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { UserDropdown } from "@/components/dashboard/UserDropdown";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminOrRedirect();

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-[color:var(--l2-bg-primary)]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-l2-red/30 bg-[color:var(--l2-bg-secondary)] px-5 lg:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex shrink-0 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo.png"
                alt="L2 Impure"
                className="h-[70px] w-auto"
              />
            </Link>
            <span className="rounded-md bg-l2-red/15 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-[1.5px] text-l2-red">
              Admin
            </span>
            <Link
              href="/dashboard"
              className="hidden font-display text-[10px] font-semibold uppercase tracking-wider text-white/55 transition hover:text-white sm:inline"
            >
              ← Voltar ao painel
            </Link>
          </div>
          <UserDropdown email={admin.email} />
        </header>
        <div className="flex flex-1 flex-col lg:flex-row">
          <AdminSidebar />
          <main className="flex-1 px-6 py-8 lg:px-10 lg:py-10">
            <div className="mx-auto w-full max-w-[1200px]">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
