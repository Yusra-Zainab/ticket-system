import { notFound } from "next/navigation";

import PortalTicketDetailsView from "@/components/features/PortalTicketDetailsView";
import { requireClientPageSession } from "@/lib/auth";
import { findClientTicket } from "@/lib/clientPortal";

export const dynamic = "force-dynamic";

export default async function ClientTicketDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireClientPageSession();
  const { id } = await params;
  const ticket = await findClientTicket(user, id);

  if (!ticket) notFound();

  return (
    <div className="px-5 pb-8 sm:px-8 lg:px-10">
      <PortalTicketDetailsView
        portal="client"
        ticket={ticket}
        currentUserId={String(user.id)}
        currentUserName={user.name}
      />
    </div>
  );
}
