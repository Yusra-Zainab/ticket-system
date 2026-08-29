import { notFound } from "next/navigation";

import NewClientForm, {
  type SectionId,
} from "@/components/features/NewClientForm";

import { requireResourcePageSession } from "@/lib/auth";
import {
  getRolePermissions,
  findClientRecord,
  listProjects,
  listUsers,
} from "@/lib/db";

export const dynamic = "force-dynamic";

const validSections = new Set<SectionId>([
  "client-information",
  "primary-contact",
  "upwork-details",
  "client-team",
  "communication",
  "projects",
  "integration",
  "notes",
]);

export default async function ResourcePortalEditClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("Edit Clients")) {
    notFound();
  }

  const { id } = await params;
  const { section } = await searchParams;

  const [client, users, projects] = await Promise.all([
    findClientRecord(id),
    listUsers(),
    listProjects("OPEN"),
  ]);

  if (!client) {
    notFound();
  }

  const initialSection: SectionId =
    section && validSections.has(section as SectionId)
      ? (section as SectionId)
      : "client-information";

  return (
    <NewClientForm
      initialRecord={client}
      users={users}
      projects={projects}
      initialSection={initialSection}
      clientBaseHref="/resource-portal/clients"
      projectBaseHref="/resource-portal/projects"
    />
  );
}
