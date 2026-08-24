import { notFound } from "next/navigation";

import RoleForm from "@/components/features/RoleForm";

import { findRole } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewRolePage({
  searchParams,
}: {
  searchParams: Promise<{
    role?: string;
  }>;
}) {
  const { role: roleId } = await searchParams;

  const role = roleId ? await findRole(roleId) : undefined;

  if (roleId && !role) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <RoleForm initialRole={role} />
    </div>
  );
}
