import { notFound } from "next/navigation";

import EmailSettingsForm from "@/components/features/EmailSettingsForm";
import { requireResourcePageSession } from "@/lib/auth";
import { getEmailSettings, getRolePermissions } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourcePortalEmailSettingsPage() {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("Configure Email")) {
    notFound();
  }

  const settings = await getEmailSettings();

  return <EmailSettingsForm initialSettings={settings} />;
}
