import { Plus } from "lucide-react";

import ClientTeamTable from "@/components/client-portal/ClientTeamTable";
import PageHeader from "@/components/ui/PageHeader";
import { requireClientPageSession } from "@/lib/auth";
import { listClientTeam } from "@/lib/clientPortal";

export const dynamic = "force-dynamic";

export default async function ClientTeamPage() {
  const user = await requireClientPageSession();
  const team = await listClientTeam(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Team"
        action="New Member"
        actionHref="/client-portal/team/new"
        actionIcon={Plus}
      />

      <ClientTeamTable members={team} />
    </div>
  );
}
