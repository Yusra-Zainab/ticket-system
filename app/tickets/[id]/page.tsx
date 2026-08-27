import { notFound } from "next/navigation";

import TicketDetailsView from "@/components/features/TicketDetailsView";

import { requireAdminPageSession } from "@/lib/auth";

import { findTicket, listResourceRows } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  /*
   * REQUIRED.
   *
   * This is what was missing and causing:
   *
   * ReferenceError: user is not defined
   */
  const user = await requireAdminPageSession();

  const { id } = await params;

  /*
   * Load the ticket and assignable resources
   * at the same time.
   */
  const [ticket, resources] = await Promise.all([
    findTicket(id),

    listResourceRows("OPEN"),
  ]);

  if (!ticket) {
    notFound();
  }

  const resourceOptions = resources
    .map((resource) => resource.name)
    .filter((name) => Boolean(name.trim()));

  return (
    <TicketDetailsView
      ticket={ticket}
      portal="admin"
      currentRole="Admin"
      currentUserId={String(user.id)}
      currentUserName={user.name}
      resourceOptions={resourceOptions}
    />
  );
}
