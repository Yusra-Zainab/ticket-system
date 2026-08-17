import { notFound } from "next/navigation";
import { CalendarDays, Flag, UserRound } from "lucide-react";
import ActivityTimeline from "@/components/ui/ActivityTimeline";
import { Avatar } from "@/components/ui/Avatar";
import SidebarLayout from "@/components/ui/SidebarLayout";
import StatusBadge from "@/components/ui/StatusBadge";
import { mockActivities, mockTickets } from "@/data/mockData";
import { formatDate, sanitizeRichText } from "@/lib/utils";
export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = mockTickets.find((item) => item.id === id);
  if (!ticket) notFound();
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">
              TKT-{ticket.id.padStart(4, "0")}
            </span>
            <StatusBadge status={ticket.status} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {ticket.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{ticket.project}</p>
        </div>
        <button className="button-primary">Change status</button>
      </div>
      <SidebarLayout
        sidebar={
          <div className="space-y-5">
            <section className="card p-5">
              <h2 className="font-bold">Ticket metadata</h2>
              <dl className="mt-4 space-y-4">
                <Meta
                  icon={Flag}
                  label="Priority"
                  value={`Priority ${ticket.priority}`}
                />
                <Meta
                  icon={UserRound}
                  label="Assigned to"
                  value={ticket.assignedTo}
                />
                <Meta
                  icon={CalendarDays}
                  label="Created"
                  value={formatDate(ticket.created)}
                />
                <Meta
                  icon={CalendarDays}
                  label="Due date"
                  value={formatDate(ticket.dueDate)}
                />
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                {ticket.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </section>
          </div>
        }
      >
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="font-bold text-slate-900">Description</h2>
            <div
              className="prose-ticket mt-4 text-sm text-slate-600"
              dangerouslySetInnerHTML={{
                __html: sanitizeRichText(ticket.description),
              }}
            />
          </section>
          <section className="card p-5 sm:p-6">
            <h2 className="font-bold text-slate-900">Comments</h2>
            <div className="mt-5 flex gap-3">
              <Avatar name="Phoenix Baker" />
              <div className="flex-1">
                <textarea
                  className="field"
                  rows={3}
                  placeholder="Write a comment…"
                />
                <div className="mt-2 flex justify-end">
                  <button className="button-primary">Add comment</button>
                </div>
              </div>
            </div>
            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="flex gap-3">
                <Avatar name="Olivia Rhy" />
                <div>
                  <p className="text-sm">
                    <strong>Olivia Rhy</strong>{" "}
                    <span className="text-xs text-slate-400">
                      · 2 hours ago
                    </span>
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    I reproduced this in Chrome and Safari. The response headers
                    are missing a filename.
                  </p>
                </div>
              </div>
            </div>
          </section>
          <section className="card p-5 sm:p-6">
            <h2 className="mb-5 font-bold text-slate-900">Activity</h2>
            <ActivityTimeline activities={mockActivities} />
          </section>
        </div>
      </SidebarLayout>
    </div>
  );
}
function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flag;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon size={17} className="mt-0.5 text-slate-400" />
      <div>
        <dt className="text-xs text-slate-400">{label}</dt>
        <dd className="text-sm font-semibold text-slate-700">{value}</dd>
      </div>
    </div>
  );
}
