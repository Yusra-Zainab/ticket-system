import NewProjectForm from "@/components/features/NewProjectForm";
import { listClients, listUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const [users, clients] = await Promise.all([listUsers(), listClients()]);

  return (
    <NewProjectForm
      users={users}
      clients={clients}
      returnTo={returnTo}
    />
  );
}
