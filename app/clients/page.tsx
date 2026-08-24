import { Plus } from "lucide-react";

import ClientsTable from "@/components/features/ClientsTable";

import PageHeader from "@/components/ui/PageHeader";

import { listClientRows } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await listClientRows();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients List"
        action="New Client"
        actionHref="/clients/new"
        actionIcon={Plus}
      />

      <ClientsTable initialClients={clients} />
    </div>
  );
}
