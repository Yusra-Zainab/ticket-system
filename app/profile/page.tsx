import ProfileDetails from "@/components/features/ProfileDetails";

import { requireAdminPageSession } from "@/lib/auth";
import { countActiveSessionsForUser, findAdminUser } from "@/lib/db";
import { defaultProfileTimeZone } from "@/lib/profileUtils";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sessionUser = await requireAdminPageSession();
  const [profile, activeSessions] = await Promise.all([
    findAdminUser(String(sessionUser.id)),
    countActiveSessionsForUser(sessionUser.id),
  ]);

  if (!profile) {
    return null;
  }

  return (
    <ProfileDetails
      profile={{
        firstName: profile.formData.firstName || "",
        lastName: profile.formData.lastName || "",
        email: profile.formData.workEmail || profile.email,
        phone: profile.formData.phone || "",
        jobTitle: profile.formData.jobTitle || profile.role,
        timeZone: profile.formData.timeZone || defaultProfileTimeZone,
        role: profile.role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
        twoFactorEnabled: profile.formData.twoFactorEnabled ?? true,
      }}
      activeSessions={activeSessions}
    />
  );
}
