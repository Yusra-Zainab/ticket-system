import ResourcePortalShell from "@/components/resource-portal/ResourcePortalShell";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions } from "@/lib/db";
import { listResourceNotifications } from "@/lib/resourcePortal";

export const dynamic = "force-dynamic";

export default async function ResourceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireResourcePageSession();

  const [notifications, permissions] = await Promise.all([
    listResourceNotifications(user),
    getRolePermissions(user.role),
  ]);


  return (
    <>
      <style>{`
        .resource-portal-shell {
          min-height: 100vh;
          background: #ffffff;
          color: #101828;
          font-family: Geist, var(--font-inter), Inter, Arial, sans-serif;
        }

        .resource-portal-shell *,
        .resource-portal-shell *::before,
        .resource-portal-shell *::after {
          box-sizing: border-box;
        }

        /*
         * Same outer layout pattern as the admin AppLayout:
         * centered content, generous top spacing and room for the
         * floating action bar at the bottom.
         */
        .resource-portal-frame {
          width: 100%;
          min-height: 100vh;
          margin: 0 auto;
          padding: 32px 0 96px;
        }

        /*
         * Global resource breadcrumb row.
         * This intentionally replaces the breadcrumb/history row that
         * older ResourcePageHeader instances render inside each page.
         */
        .resource-shell-breadcrumbs {
          display: flex;
          min-height: 48px;
          align-items: center;
          gap: 10px;
          margin: 0 32px;
          overflow-x: auto;
          border-bottom: 1px solid rgba(2, 132, 199, 0.1);
          padding: 8px 20px;
          color: #0284c7;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          scrollbar-width: none;
        }

        .resource-shell-breadcrumbs::-webkit-scrollbar {
          display: none;
        }

        .resource-shell-home,
        .resource-shell-history-button,
        .resource-shell-refresh-button {
          display: grid;
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          place-items: center;
          border: 0;
          background: #f0f9ff;
          color: #0284c7;
          text-decoration: none;
          cursor: pointer;
        }

        .resource-shell-history-button:disabled {
          cursor: not-allowed;
          opacity: 0.4;
        }

        .resource-shell-home {
          border-radius: 8px;
        }

        .resource-shell-home:hover,
        .resource-shell-history-button:not(:disabled):hover,
        .resource-shell-refresh-button:not(:disabled):hover {
          background: #e0f2fe;
        }

        .resource-shell-home:focus-visible,
        .resource-shell-history-button:focus-visible,
        .resource-shell-refresh-button:focus-visible,
        .resource-shell-crumb-link:focus-visible {
          outline: 2px solid #06b6d4;
          outline-offset: 2px;
        }

        .resource-shell-crumb {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .resource-shell-chevron {
          flex: none;
          color: #0284c7;
        }

        .resource-shell-crumb-link,
        .resource-shell-crumb-current {
          display: inline-flex;
          min-height: 32px;
          align-items: center;
          border-radius: 8px;
          padding: 6px 8px;
          color: #0284c7;
          text-decoration: none;
        }

        .resource-shell-crumb-link:hover {
          background: #f0f9ff;
        }

        .resource-shell-crumb-current {
          background: #f0f9ff;
          padding-inline: 12px;
        }

        .resource-shell-history {
          display: flex;
          flex: none;
          margin-left: 8px;
          overflow: hidden;
          border-radius: 8px;
          background: #f0f9ff;
          color: #0284c7;
        }

        .resource-shell-history-button:first-child {
          border-radius: 8px 0 0 8px;
        }

        .resource-shell-history-button:last-child {
          border-left: 1px solid #ffffff;
          border-radius: 0 8px 8px 0;
        }

        .resource-shell-refresh-button {
          margin-left: 4px;
          border-radius: 8px;
        }

        .resource-shell-refresh-button:disabled {
          cursor: default;
          opacity: 0.6;
        }

        .resource-shell-refreshing {
          animation: resourceShellSpin 0.8s linear infinite;
        }

        @keyframes resourceShellSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .resource-portal-main {
          width: 100%;
          min-width: 0;
          padding-inline: 32px;
        }

        /*
         * Breadcrumbs/history are now owned by ResourcePortalShell,
         * so hide the older per-page row to prevent duplicate top bars.
         */
        .resource-portal-shell .resource-page-tools-row {
          display: none !important;
        }

        /* Match the sticky admin PageHeader behaviour. */
        .resource-portal-shell .resource-page-header {
          position: sticky;
          top: 0;
          z-index: 30;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        @media (max-width: 760px) {
          .resource-portal-frame {
            padding-top: 24px;
          }

          .resource-portal-main {
            padding-inline: 16px;
          }

          .resource-shell-breadcrumbs {
            margin: 0 16px;
            gap: 8px;
            padding: 6px 12px;
          }

          .resource-shell-home,
          .resource-shell-history-button,
          .resource-shell-refresh-button {
            width: 34px;
            height: 34px;
            flex-basis: 34px;
          }

          .resource-shell-crumb-link,
          .resource-shell-crumb-current {
            min-height: 30px;
            padding: 5px 7px;
          }
        }
      `}</style>

      <ResourcePortalShell
        notifications={notifications}
        permissions={permissions}
        notificationReadStorageKey={`resource-notification-read-ids-${user.id}`}
      >
        {children}
      </ResourcePortalShell>
    </>
  );
}
