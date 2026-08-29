import { Plus } from "lucide-react";
import { notFound } from "next/navigation";

import ClientsTable from "@/components/features/ClientsTable";
import PageHeader from "@/components/ui/PageHeader";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions, listClientRows } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourcePortalClientsPage() {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("View Clients")) {
    notFound();
  }

  const clients = await listClientRows();
  const canCreate = permissions.includes("Create Clients");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients List"
        action={canCreate ? "New Client" : undefined}
        actionHref={canCreate ? "/resource-portal/clients/new" : undefined}
        actionIcon={Plus}
      />

      <ClientsTable
        initialClients={clients}
        detailBaseHref="/resource-portal/clients"
        allowDelete={permissions.includes("Delete Clients")}
      />
    </div>
  );
}

