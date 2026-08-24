import EmailSettingsForm from "@/components/features/EmailSettingsForm";

import { getEmailSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EmailSettingsPage() {
  const settings = await getEmailSettings();

  return <EmailSettingsForm initialSettings={settings} />;
}
