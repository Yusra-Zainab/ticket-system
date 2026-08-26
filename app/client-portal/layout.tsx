import ClientPortalShell from "@/components/client-portal/ClientPortalShell";
import { requireClientPageSession } from "@/lib/auth";
import { listClientNotifications } from "@/lib/clientPortal";

export const dynamic = "force-dynamic";

export default async function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireClientPageSession();
  const notifications = await listClientNotifications(user);

  return (
    <ClientPortalShell
      userName={user.name}
      notifications={notifications}
      notificationReadStorageKey={`client-notification-read-ids-${user.id}`}
    >
      {children}
    </ClientPortalShell>
  );
}
