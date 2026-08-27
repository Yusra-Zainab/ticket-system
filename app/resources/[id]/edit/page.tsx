import { notFound } from "next/navigation";

import NewResourceForm, {
  type ResourceDraft,
  type SectionId,
} from "@/components/features/NewResourceForm";

import { findResource, listRoles } from "@/lib/db";
import { isResourceRole } from "@/lib/userRoles";

export const dynamic = "force-dynamic";

const validSections = new Set<SectionId>([
  "basic",
  "contact",
  "skills",
  "reporting",
  "projects",
  "modules",
]);

export default async function EditResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    section?: string;
  }>;
}) {
  const { id } = await params;
  const { section } = await searchParams;

  const resource = await findResource(id);
  const roles = await listRoles();
  const roleOptions = roles
    .map((role) => role.name)
    .filter((role) => isResourceRole(role));

  if (!resource || resource.lifecycle !== "OPEN") {
    notFound();
  }

  const initialSection: SectionId =
    section && validSections.has(section as SectionId)
      ? (section as SectionId)
      : "basic";

  const initialResource: ResourceDraft = {
    id: resource.id,
    lifecycle: resource.lifecycle,
    name: resource.name,
    email: resource.email,
    role: resource.role,
    avatar: resource.avatar ?? null,
    formData: resource.formData ?? {},
  };

  return (
    <NewResourceForm
      roleOptions={roleOptions}
      initialResource={initialResource}
      initialSection={initialSection}
    />
  );
}
