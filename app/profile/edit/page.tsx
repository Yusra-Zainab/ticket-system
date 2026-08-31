import EditProfileForm from "@/components/features/EditProfileForm";

import { requireAdminPageSession } from "@/lib/auth";
import { findAdminUser } from "@/lib/db";
import { defaultProfileTimeZone } from "@/lib/profileUtils";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const sessionUser = await requireAdminPageSession();
  const profile = await findAdminUser(String(sessionUser.id));

  if (!profile) {
    return null;
  }

  return (
    <EditProfileForm
      initialProfile={{
        firstName: profile.formData.firstName || "",
        lastName: profile.formData.lastName || "",
        email: profile.formData.workEmail || profile.email,
        phone: profile.formData.phone || "",
        jobTitle: profile.formData.jobTitle || profile.role,
        timeZone: profile.formData.timeZone || defaultProfileTimeZone,
        role: profile.role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
        avatar: profile.avatar || "",
        twoFactorEnabled: profile.formData.twoFactorEnabled ?? true,
      }}
    />
  );
}
