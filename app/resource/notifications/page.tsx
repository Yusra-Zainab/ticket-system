import ResourceNotificationsList from "@/components/resource-portal/ResourceNotificationsList";

export const dynamic = "force-dynamic";

export default function ResourceNotificationsPage() {
  return (
    <div className="resource-notifications-page-shell">
      <style>{`
        .resource-notifications-page-shell {
          width: 100%;
          padding: 16px 32px 32px;
        }

        @media (max-width: 760px) {
          .resource-notifications-page-shell {
            padding: 16px;
          }
        }
      `}</style>

      <ResourceNotificationsList />
    </div>
  );
}