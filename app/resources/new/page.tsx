import NewResourceForm from "@/components/features/NewResourceForm";

import { findResource, listRoles } from "@/lib/db";
import { isResourceRole } from "@/lib/userRoles";

export default async function NewResourcePage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const { draft } = await searchParams;
  const resource = draft ? await findResource(draft) : undefined;
  const roles = await listRoles();
  const roleOptions = roles
    .map((role) => role.name)
    .filter((role) => isResourceRole(role));

  return (
    <NewResourceForm
      roleOptions={roleOptions}
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
