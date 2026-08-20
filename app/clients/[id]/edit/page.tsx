import { notFound } from "next/navigation";

import NewClientForm, {
  type SectionId,
} from "@/components/features/NewClientForm";

import { findClientRecord, listProjects, listUsers } from "@/lib/db";

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

export default async function EditClientPage({
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
    />
  );
}
