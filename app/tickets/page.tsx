import { Plus } from "lucide-react";
import TicketsTable from "@/components/features/TicketsTable";
import PageHeader from "@/components/ui/PageHeader";
export default function TicketsPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="Tickets List"
        action="Create a New Ticket"
        actionHref="/tickets/new"
        actionIcon={Plus}
      />
      <TicketsTable />
    </div>
  );
}
