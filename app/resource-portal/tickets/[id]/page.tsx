import { notFound } from "next/navigation";

import ResourceTicketDetail from "@/components/resource-portal/ResourceTicketDetail";
import { requireResourcePageSession } from "@/lib/auth";
import { findResourceTicket } from "@/lib/resourcePortal";

export const dynamic = "force-dynamic";

export default async function ResourceTicketDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireResourcePageSession();
  const { id } = await params;
  const ticket = await findResourceTicket(user, id);

  if (!ticket) notFound();

  return (
    <div className="resource-admin-ticket-detail-shell">
      <style>{`
        .resource-admin-ticket-detail-shell {
          width: min(100%, 1400px);
          margin: 0 auto;
          padding: 0 32px 40px;
        }

        @media (max-width: 760px) {
          .resource-admin-ticket-detail-shell {
            padding: 0 16px 28px;
          }
        }
      `}</style>

      <ResourceTicketDetail ticket={ticket} />
    </div>
  );
}