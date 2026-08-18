import { Plus } from "lucide-react";
import TicketsTable from "@/components/features/TicketsTable";
import PageHeader from "@/components/ui/PageHeader";
import { connection } from "next/server";
import { listTickets } from "@/lib/db";
import type { Ticket } from "@/types";
export default async function TicketsPage() {
  await connection();
  let stored: Ticket[] = []; try { stored = await listTickets("OPEN"); } catch { stored = []; }
  return (
    <div className="space-y-7">
      <PageHeader
        title="Tickets List"
        action="Create a New Ticket"
        actionHref="/tickets/new"
        actionIcon={Plus}
      />
      <TicketsTable initialTickets={stored} />
    </div>
  );
}
