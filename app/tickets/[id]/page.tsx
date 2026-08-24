import { notFound } from "next/navigation";
import TicketDetailsView from "@/components/features/TicketDetailsView";
import { findTicket, listResourceRows } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let ticket;
  let resources: Awaited<ReturnType<typeof listResourceRows>> = [];
  try {
    [ticket, resources] = await Promise.all([
      findTicket(id),
      listResourceRows("OPEN"),
    ]);
  } catch {
    ticket = undefined;
    resources = [];
  }
  if (!ticket) notFound();
  // Replace this fallback with the authenticated session role when auth is connected.
  return (
    <TicketDetailsView
      ticket={ticket}
      currentRole="Admin"
      resourceOptions={resources.map((resource) => resource.name)}
    />
  );
}
