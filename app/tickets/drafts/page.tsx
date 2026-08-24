import PageHeader from "@/components/ui/PageHeader";
import TicketsTable from "@/components/features/TicketsTable";
import { connection } from "next/server";
import { listTickets } from "@/lib/db";
import type { Ticket } from "@/types";

export const dynamic = "force-dynamic";

export default async function TicketDraftsPage() {
  await connection();
  let drafts: Ticket[] = [];
  try {
    drafts = await listTickets("DRAFT");
  } catch {
    drafts = [];
  }
  return (
    <div className="space-y-7">
      <PageHeader title="Ticket Drafts" />
      <TicketsTable variant="drafts" initialTickets={drafts} />
    </div>
  );
}
