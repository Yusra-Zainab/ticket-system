import ResourceProfileForm from "@/components/resource-portal/ResourceProfileForm";
import { requireResourcePageSession } from "@/lib/auth";
import { getResourceProfile } from "@/lib/resourcePortal";

export const dynamic = "force-dynamic";

export default async function EditResourceProfilePage() {
  const user = await requireResourcePageSession();
  const profile = await getResourceProfile(user);

  return (
    <div className="mx-auto max-w-7xl">
      <ResourceProfileForm profile={profile} />;
    </div>
  );
}
