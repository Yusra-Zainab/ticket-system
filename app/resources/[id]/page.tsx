import { notFound } from "next/navigation";
import ActivityTimeline from "@/components/ui/ActivityTimeline";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { findUser, listProjects } from "@/lib/db";
export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await findUser(id);
  if (!user) notFound();
  const assignments = (await listProjects()).filter((project) =>
    project.team.includes(user.name),
  );
  const mockActivities: never[] = [];
  return (
    <div className="space-y-6">
      <PageHeader
        title={user.name}
        description={`${user.role} · Resource profile`}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Capacity</h2>
            <StatusBadge status={user.status} />
          </div>
          <p className="mt-5 text-4xl font-black">{user.workload}%</p>
          <div className="mt-3 h-3 rounded-full bg-slate-100">
            <div
              className={
                user.workload > 85
                  ? "h-3 rounded-full bg-red-500"
                  : "h-3 rounded-full bg-sky-500"
              }
              style={{ width: `${user.workload}%` }}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {user.skills.map((skill) => (
              <span
                className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold"
                key={skill}
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="font-bold">Assignments</h2>
          <div className="mt-4 space-y-3">
            {assignments.map((project) => (
              <a
                className="block rounded-xl border border-slate-100 p-4 hover:bg-slate-50"
                href={`/projects/${project.id}`}
                key={project.id}
              >
                <p className="font-semibold">{project.name}</p>
                <p className="text-xs text-slate-400">{project.client}</p>
              </a>
            ))}
          </div>
        </section>
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-5 font-bold">Activity log</h2>
          <ActivityTimeline activities={mockActivities} />
        </section>
      </div>
    </div>
  );
}
