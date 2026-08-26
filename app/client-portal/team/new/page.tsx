import NewClientTeamMemberForm from "@/components/client-portal/NewClientTeamMemberForm";
import { requireClientPageSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewClientTeamMemberPage() {
  await requireClientPageSession();

  return <NewClientTeamMemberForm />;
}