import TicketForm from "@/components/features/TicketForm";
import PageHeader from "@/components/ui/PageHeader";
export default function NewTicketPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Create ticket"
        description="Capture the work, establish priority, and assign an owner."
      />
      <TicketForm />
    </div>
  );
}
