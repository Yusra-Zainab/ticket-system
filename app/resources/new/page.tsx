import { findResource } from "@/lib/db";

import NewResourceForm from "@/components/features/NewResourceForm";

export default async function NewResourcePage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const { draft } = await searchParams;
  const resource = draft ? await findResource(draft) : undefined;

  return (
    <NewResourceForm
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
