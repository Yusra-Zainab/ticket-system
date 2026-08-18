import { notFound } from "next/navigation";
import TicketDetailsView from "@/components/features/TicketDetailsView";
import { findTicket } from "@/lib/db";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ticket; try { ticket = await findTicket(id); } catch { ticket = undefined; }
  if (!ticket) notFound();
  // Replace this fallback with the authenticated session role when auth is connected.
  return <TicketDetailsView ticket={ticket} currentRole="Admin" />;
}
