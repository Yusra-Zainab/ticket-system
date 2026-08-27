import ResourcePageHeader from "@/components/resource-portal/ResourcePageHeader";
import ResourceTicketList from "@/components/resource-portal/ResourceTicketList";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions } from "@/lib/db";
import { listResourceTickets } from "@/lib/resourcePortal";

export const dynamic = "force-dynamic";

export default async function ResourceTicketDraftsPage() {
  const user = await requireResourcePageSession();
  const [tickets, permissions] = await Promise.all([
    listResourceTickets(user, "DRAFT"),
    getRolePermissions(user.role),
  ]);

  const canViewTickets = permissions.includes("View Tickets");
  const canCreateTickets = permissions.includes("Create Tickets");

  return (
    <div className="resource-admin-ticket-page">
      <style>{ticketDraftPageStyles}</style>
      <ResourcePageHeader
        title="Ticket Drafts"
        crumbs={[
          { label: "Tickets", href: "/resource-portal/tickets" },
          { label: "Drafts" },
        ]}
        actionLabel={canCreateTickets ? "Create a New Ticket" : undefined}
        actionHref={canCreateTickets ? "/resource-portal/tickets/new" : undefined}
      />
      {canViewTickets ? (
        <ResourceTicketList tickets={tickets} drafts currentUserId={user.id} />
      ) : null}
    </div>
  );
}

const ticketDraftPageStyles = `
  .resource-admin-ticket-page {
    width: 100%;
    min-width: 0;
    padding: 0 32px 32px;
  }

  .resource-admin-ticket-page .resource-page-header {
    position: sticky;
    top: 0;
    z-index: 30;
    margin: 0 -12px 28px;
    border-bottom: 1px solid #f1f5f9;
    background: rgba(255, 255, 255, 0.95);
    padding: 12px;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .resource-admin-ticket-page .resource-page-header-container,
  .resource-admin-ticket-page .resource-page-header-inner {
    width: 100%;
  }

  .resource-admin-ticket-page .resource-page-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .resource-admin-ticket-page .resource-page-title-copy h1 {
    margin: 0;
    color: #020617;
    font-family: Satoshi, Geist, Arial, sans-serif;
    font-size: clamp(32px, 3vw, 38px);
    font-weight: 700;
    line-height: 1.12;
    letter-spacing: -0.025em;
  }

  .resource-admin-ticket-page .resource-page-primary-action {
    display: inline-flex;
    min-height: 44px;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    gap: 9px;
    border-radius: 10px;
    background: linear-gradient(105deg, #078dcc, #20c9d8);
    padding: 10px 16px;
    color: #ffffff;
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
    box-shadow: 0 4px 10px rgba(14, 165, 233, 0.16);
  }

  .resource-admin-ticket-page .resource-page-primary-action:hover {
    filter: brightness(0.96);
    transform: translateY(-1px);
  }

  @media (max-width: 760px) {
    .resource-admin-ticket-page {
      padding: 0 16px 24px;
    }

    .resource-admin-ticket-page .resource-page-title-row {
      align-items: flex-start;
      flex-direction: column;
    }

    .resource-admin-ticket-page .resource-page-primary-action {
      width: 100%;
    }
  }
`;