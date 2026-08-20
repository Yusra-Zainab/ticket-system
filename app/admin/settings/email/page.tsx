import EmailSettingsForm from "@/components/features/EmailSettingsForm";

import { getEmailSettings } from "@/lib/db";

export default async function EmailSettingsPage() {
  const settings = await getEmailSettings();

  return <EmailSettingsForm initialSettings={settings} />;
}
