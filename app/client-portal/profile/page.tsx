import ClientProfileDetails from "@/components/client-portal/ClientProfileDetails";
import { requireClientPageSession } from "@/lib/auth";
import { getClientProfile } from "@/lib/clientPortal";
import type { ClientPortalProfile } from "@/types/clientPortal";

export const dynamic = "force-dynamic";

function fallbackProfile(user: {
  id: number;
  name: string;
  email: string;
  role: string;
}): ClientPortalProfile {
  const parts = user.name.trim().split(/\s+/).filter(Boolean);

  return {
    id: user.id,
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
    name: user.name || "Client User",
    email: user.email,
    phone: "",
    jobTitle: "",
    avatar: "",
    company: "",
    role: user.role,
    emailNotifications: true,
  };
}

export default async function ClientProfilePage() {
  const user = await requireClientPageSession();

  let profile: ClientPortalProfile;

  try {
    profile =
      (await getClientProfile(user)) ??
      fallbackProfile(user);
  } catch (error) {
    console.error("Unable to load client profile:", error);
    profile = fallbackProfile(user);
  }

  return <ClientProfileDetails profile={profile} />;
}
