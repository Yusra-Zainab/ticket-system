import AdminUsers from "@/components/features/AdminUsers";

import { listAdminUserRows, listClientRows, listResourceRows } from "@/lib/db";

export const dynamic = "force-dynamic";

export const revalidate = 0;

export default async function AdminUsersPage() {
  const [admins, resources, clients] = await Promise.all([
    listAdminUserRows(),

    listResourceRows("OPEN"),

    listClientRows(),
  ]);

  /*
   * The key makes sure the client component is remounted
   * whenever the actual Admin list returned by MySQL changes.
   *
   * This is an additional safeguard against Next's client
   * route cache preserving stale local UI state.
   */
  const adminListKey = admins
    .map((admin) =>
      [admin.id, admin.role, admin.status, admin.lastActive].join(":"),
    )
    .join("|");

  return (
    <AdminUsers
      key={adminListKey}
      admins={admins}
      resources={resources}
      clients={clients}
    />
  );
}
