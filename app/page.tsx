import {
  AlertTriangle,
  BriefcaseBusiness,
  TicketCheck,
  UsersRound,
} from "lucide-react";
import ActivityTimeline from "@/components/ui/ActivityTimeline";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  mockActivities,
  mockProjects,
  mockTickets,
  mockUsers,
} from "@/data/mockData";

export default function DashboardPage() {
  const overdue = mockTickets.filter(
    (ticket) => ticket.status === "Critical" || ticket.status === "Overdue",
  ).length;
  return (
    <div className="space-y-7">
      <PageHeader
        title="Good afternoon, Phoenix"
        description="Here is what is happening across your delivery workspace today."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total projects"
          count={mockProjects.length}
          trend={12}
          icon={<BriefcaseBusiness size={21} />}
        />
        <MetricCard
          title="Active tickets"
          count={
            mockTickets.filter((ticket) => ticket.status !== "Closed").length
          }
          trend={8}
          icon={<TicketCheck size={21} />}
          bgColor="bg-blue-50 text-blue-600"
        />
        <MetricCard
          title="Overdue tasks"
          count={overdue}
          trend={-14}
          icon={<AlertTriangle size={21} />}
          bgColor="bg-red-50 text-red-600"
        />
        <MetricCard
          title="Team members"
          count={mockUsers.length}
          trend={4}
          icon={<UsersRound size={21} />}
          bgColor="bg-violet-50 text-violet-600"
        />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="card p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Project health</h2>
              <p className="text-sm text-slate-500">
                Progress and delivery confidence
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {mockProjects.length} projects
            </span>
          </div>
          <div className="space-y-5">
            {mockProjects.slice(0, 4).map((project) => (
              <div key={project.id}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {project.name}
                    </p>
                    <p className="text-xs text-slate-400">{project.client}</p>
                  </div>
                  <StatusBadge status={project.status} size="sm" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-xs font-bold text-slate-600">
                    {project.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-slate-900">Alerts board</h2>
          <p className="mb-5 text-sm text-slate-500">Items needing attention</p>
          <div className="space-y-3">
            {mockTickets
              .filter((ticket) => ticket.priority <= 2)
              .slice(0, 4)
              .map((ticket) => (
                <a
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="block rounded-xl border border-slate-100 p-3 hover:border-sky-200 hover:bg-sky-50/40"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={
                        ticket.priority === 1
                          ? "grid size-7 shrink-0 place-items-center rounded-lg bg-red-100 text-xs font-black text-red-600"
                          : "grid size-7 shrink-0 place-items-center rounded-lg bg-yellow-100 text-xs font-black text-yellow-700"
                      }
                    >
                      {ticket.priority}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {ticket.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {ticket.project}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
          </div>
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold text-slate-900">Resource workload</h2>
          <p className="mb-5 text-sm text-slate-500">
            Current assignment capacity
          </p>
          <div className="space-y-4">
            {mockUsers.map((user) => (
              <div key={user.id}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-semibold text-slate-700">
                    {user.name}
                  </span>
                  <span
                    className={
                      user.workload > 85
                        ? "font-bold text-red-600"
                        : "text-slate-500"
                    }
                  >
                    {user.workload}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={
                      user.workload > 85
                        ? "h-2 rounded-full bg-red-500"
                        : "h-2 rounded-full bg-sky-500"
                    }
                    style={{ width: `${user.workload}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-slate-900">Recent activity</h2>
          <p className="mb-5 text-sm text-slate-500">
            Latest workspace updates
          </p>
          <ActivityTimeline activities={mockActivities} maxItems={4} />
        </div>
      </section>
    </div>
  );
}
