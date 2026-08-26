import { notFound } from "next/navigation";

import ClientTicketDetail from "@/components/client-portal/ClientTicketDetail";
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

  if (!ticket) {
    notFound();
  }

  return <ClientTicketDetail ticket={ticket} currentUserId={user.id} />;
}
