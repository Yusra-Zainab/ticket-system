import { notFound } from "next/navigation";

import NewAdminForm from "@/components/features/NewAdminForm";

import { findAdminUser } from "@/lib/db";

export default async function EditAdminPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  const admin = await findAdminUser(id);

  if (!admin) {
    notFound();
  }

  return <NewAdminForm initialAdmin={admin} />;
}
