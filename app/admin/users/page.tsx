import AdminUsers from "@/components/features/AdminUsers";

import { listAdminUserRows, listClientRows, listResourceRows } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [admins, resources, clients] = await Promise.all([
    listAdminUserRows(),

    listResourceRows("OPEN"),

    listClientRows(),
  ]);

  return <AdminUsers admins={admins} resources={resources} clients={clients} />;
}
