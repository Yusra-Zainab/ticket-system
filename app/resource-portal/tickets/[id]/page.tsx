import { notFound } from "next/navigation";

import PortalTicketDetailsView from "@/components/features/PortalTicketDetailsView";
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
    <div className="px-5 pb-8 sm:px-8 lg:px-12 xl:px-16">
      <PortalTicketDetailsView
        portal="resource"
        ticket={ticket}
        currentUserId={String(user.id)}
        currentUserName={user.name}
      />
    </div>
  );
}
