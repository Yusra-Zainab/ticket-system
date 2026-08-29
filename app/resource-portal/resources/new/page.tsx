import { notFound } from "next/navigation";

import NewResourceForm from "@/components/features/NewResourceForm";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions, findResource, listRoles } from "@/lib/db";
import { isResourceRole } from "@/lib/userRoles";

export const dynamic = "force-dynamic";

export default async function ResourcePortalNewResourcePage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("Create Resources")) {
    notFound();
  }

  const { draft } = await searchParams;
  const resource = draft ? await findResource(draft) : undefined;
  const roles = await listRoles();
  const roleOptions = roles
    .map((role) => role.name)
    .filter((role) => isResourceRole(role));

  return (
    <NewResourceForm
      roleOptions={roleOptions}
      resourceBaseHref="/resource-portal/resources"
      projectBaseHref="/resource-portal/projects"
      rolesNewHref="/resource-portal/roles/new"
      initialResource={
        resource
          ? {
              id: resource.id,
              lifecycle: resource.lifecycle,
              name: resource.name,
              email: resource.email,
              role: resource.role,
              avatar: resource.avatar ?? null,
              formData: resource.formData ?? {},
            }
          : undefined
      }
    />
  );
}
