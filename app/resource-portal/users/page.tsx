import AdminUsers from "@/components/features/AdminUsers";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions, listAdminUserRows, listClientRows, listResourceRows } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourcePortalUsersPage() {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("View Users")) {
    const { notFound } = await import("next/navigation");
    notFound();
  }

  const [admins, resources, clients] = await Promise.all([
    listAdminUserRows(),
    listResourceRows("OPEN"),
    listClientRows(),
  ]);

  const canViewResources = permissions.includes("View Resources");
  const canViewClients = permissions.includes("View Clients");

  const adminListKey = admins
    .map((admin) => [admin.id, admin.role, admin.status, admin.lastActive].join(":"))
    .join("|");

  return (
    <div className="space-y-6">
      <AdminUsers
        key={adminListKey}
        admins={admins}
        resources={canViewResources ? resources : []}
        clients={canViewClients ? clients : []}
        usersCreateHref="/resource-portal/users/new"
        usersEditHrefBase="/resource-portal/users"
        resourcesCreateHref="/resource-portal/resources/new"
        clientsCreateHref="/resource-portal/clients/new"
        resourcesDetailHref="/resource-portal/resources"
        clientsDetailHref="/resource-portal/clients"
        canCreateUsers={permissions.includes("Create Users")}
        canEditUsers={permissions.includes("Edit Users")}
        canDisableUsers={permissions.includes("Disable Users")}
        canDeleteUsers={permissions.includes("Delete Users")}
        canCreateResources={permissions.includes("Create Resources")}
        canCreateClients={permissions.includes("Create Clients")}
      />
    </div>
  );
}
