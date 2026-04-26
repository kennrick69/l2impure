import { isNpcEditsPending } from "@/lib/npc-pending";
import { NpcEditsPendingBanner } from "@/components/admin/NpcEditsPendingBanner";

export default async function NpcsAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pending = await isNpcEditsPending();
  return (
    <>
      <NpcEditsPendingBanner pending={pending} />
      {children}
    </>
  );
}
