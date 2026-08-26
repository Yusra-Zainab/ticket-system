import { notFound } from "next/navigation";

import NewClientTeamMemberForm from "@/components/client-portal/NewClientTeamMemberForm";
import { requireClientPageSession } from "@/lib/auth";
import { findClientTeamMember } from "@/lib/clientPortal";

export const dynamic = "force-dynamic";

export default async function EditClientTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireClientPageSession();
  const { id } = await params;

  const member = await findClientTeamMember(user, id);

  if (!member) {
    notFound();
  }

  return (
    <NewClientTeamMemberForm
      initialMember={member}
    />
  );
}