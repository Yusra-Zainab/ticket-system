import NewClientForm from "@/components/features/NewClientForm";
import { listProjects, listUsers } from "@/lib/db";

export default async function NewClientPage() {
  const [users, projects] = await Promise.all([
    listUsers(),
    listProjects("OPEN"),
  ]);

  return <NewClientForm users={users} projects={projects} />;
}
