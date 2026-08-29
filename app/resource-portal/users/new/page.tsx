import NewAdminForm from "@/components/features/NewAdminForm";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourcePortalNewUserPage() {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("Create Users")) {
    const { notFound } = await import("next/navigation");
    notFound();
  }

  return <NewAdminForm usersBaseHref="/resource-portal/users" />;
}
