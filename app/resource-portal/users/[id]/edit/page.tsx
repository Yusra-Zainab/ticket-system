import { notFound } from "next/navigation";

import NewAdminForm from "@/components/features/NewAdminForm";
import { requireResourcePageSession } from "@/lib/auth";
import { findAdminUser, getRolePermissions } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourcePortalEditUserPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("Edit Users")) {
    notFound();
  }

  const { id } = await params;
  const admin = await findAdminUser(id);

  if (!admin) {
    notFound();
  }

  return <NewAdminForm initialAdmin={admin} usersBaseHref="/resource-portal/users" />;
}
