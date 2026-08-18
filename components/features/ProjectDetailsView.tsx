"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, FileText, RefreshCcw } from "lucide-react";

import ProjectTabs, {
  type ProjectTab,
} from "@/components/features/ProjectTabs";
import ProjectStatus from "@/components/features/ProjectStatus";
import { usePageSearch } from "@/components/providers/PageSearchProvider";
import { Avatar } from "@/components/ui/Avatar";
import { cn, formatDate } from "@/lib/utils";
import type { Project, Ticket, User } from "@/types";

type UpdateRow = {
  id: string;
  date: string;
  title: string;
  user: string;
};

type LinkRow = {
  id: string;
  title: string;
  url: string;
  date: string;
};

export default function ProjectDetailsView({
  project,
  tickets,
  users,
}: {
  project: Project;
  tickets: Ticket[];
  users: User[];
}) {
  const router = useRouter();
  const { query } = usePageSearch();
  const [activeTab, setActiveTab] = useState<ProjectTab>("Overview");

  const projectTickets = useMemo(
    () => tickets.filter((ticket) => ticket.project === project.name),
    [project.name, tickets],
  );

  const team = useMemo(
    () =>
      project.teamMembers?.length
        ? project.teamMembers
        : users
            .filter((user) => project.team.includes(user.name))
            .map((user) => ({
              id: user.id,
              name: user.name,
              role: user.role,
              avatar: user.avatar ?? null,
            })),
    [project.team, project.teamMembers, users],
  );

  const modules = useMemo(
    () =>
      Array.from(
        new Set(
          projectTickets.flatMap((ticket) => {
            const data = (ticket.formData ?? {}) as Record<string, unknown>;
            return [data.module, data.subModule].filter(
              (value): value is string =>
                typeof value === "string" && value.trim().length > 0,
            );
          }),
        ),
      ),
    [projectTickets],
  );

  const links = useMemo<LinkRow[]>(
    () =>
      projectTickets.flatMap((ticket) => {
        const data = (ticket.formData ?? {}) as Record<string, unknown>;
        const urls = Array.isArray(data.urls)
          ? data.urls.filter(
              (value): value is string => typeof value === "string",
            )
          : [];

        return urls.map((url, index) => ({
          id: `${ticket.id}-${index}`,
          title: url.replace(/^https?:\/\//, ""),
          url,
          date: ticket.created,
        }));
      }),
    [projectTickets],
  );

  const updates = useMemo<UpdateRow[]>(
    () =>
      projectTickets.map((ticket) => ({
        id: ticket.id,
        date: ticket.created,
        title: `${ticket.title} - ${ticket.status}`,
        user: ticket.assignedTo || ticket.reporter || "-",
      })),
    [projectTickets],
  );

  const search = query.trim().toLowerCase();

  const filteredTickets = search
    ? projectTickets.filter((ticket) =>
        `${ticket.title} ${ticket.status} ${ticket.assignedTo} ${ticket.reporter}`
          .toLowerCase()
          .includes(search),
      )
    : projectTickets;

  const filteredTeam = search
    ? team.filter((member) =>
        `${member.name} ${member.role}`.toLowerCase().includes(search),
      )
    : team;

  const filteredUpdates = search
    ? updates.filter((row) =>
        `${row.date} ${row.title} ${row.user}`.toLowerCase().includes(search),
      )
    : updates;

  return (
    <div className="space-y-6 pb-28">
      <header className="sticky top-0 z-20 -mx-3 bg-white/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1
              className="text-[30px] font-bold leading-[38px] text-[#101828]"
              style={{ fontFamily: "Satoshi, Arial, sans-serif" }}
            >
              {project.name}
            </h1>
            <p className="mt-2 text-[16px] font-normal leading-6 text-[#475467]">
              <span className="font-semibold text-[#344054]">Client:</span>{" "}
              <span className="font-normal">{project.client}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/projects/${project.id}/edit`}
              className="project-action-outline"
            >
              Edit Project
            </Link>
            <Link
              href={`/modules/new?project=${encodeURIComponent(project.id)}&projectName=${encodeURIComponent(project.name)}`}
              className="project-action-outline"
            >
              Add Module
            </Link>
            <Link
              href={`/tickets/new?project=${encodeURIComponent(project.name)}`}
              className="project-action-outline"
            >
              Create Ticket
            </Link>
          </div>
        </div>
      </header>

      <section className="project-metrics-grid rounded-[10px] bg-[#06B6D4] p-2">
        <article className="project-metric-card">
          <div className="grid h-full grid-cols-2 gap-4">
            <MetricGroup label="Status">
              <ProjectStatus status={project.status} subtle size="md" />
            </MetricGroup>
            <MetricGroup label="Priority">
              <PriorityBadge priority={project.priority} />
            </MetricGroup>
          </div>
        </article>

        <MetricCard
          label="Open Tickets"
          value={String(project.openTickets ?? filteredTickets.length)}
        />
        <MetricCard
          label="Assigned Team"
          value={`${team.length} ${team.length === 1 ? "Member" : "Members"}`}
        />
        <MetricCard label="Progress %" value={`${project.progress}%`} />
        <MetricCard
          label="Last Updated"
          value={formatProjectDate(project.lastUpdated)}
        />
      </section>

      <ProjectTabs value={activeTab} onValueChange={setActiveTab} />

      {activeTab === "Overview" && (
        <div className="space-y-6">
          <Section
            title="Project Brief"
            body={
              project.description?.trim() ||
              "Project brief is not stored in the current database record."
            }
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title="Key Modules"
              body={
                modules.length
                  ? modules.join(", ")
                  : "No module records found in ticket data."
              }
            />
            <Section
              title="Current Focus"
              body={
                stripHtml(projectTickets[0]?.description ?? "") ||
                "No current focus found in project ticket data."
              }
            />
          </div>

          <Section
            title="Important Links"
            body={
              links.length ? (
                <div className="space-y-2">
                  {links.slice(0, 5).map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-[16px] leading-7 text-[#475467] underline decoration-[#D0D5DD] underline-offset-4 hover:text-[#0284C7]"
                    >
                      {item.title}
                    </a>
                  ))}
                </div>
              ) : (
                "No project links found in ticket data."
              )
            }
          />

          <Section
            title="Project Notes"
            body="Project notes are not stored in the current project record."
          />

          <section className="overflow-hidden rounded-[12px] border border-[#EAECF0] bg-white">
            <div className="border-b border-[#EAECF0] px-6 py-4">
              <h2 className="project-detail-subtitle">Latest Updates</h2>
            </div>
            <table className="w-full table-fixed">
              <thead className="bg-[#F9FAFB] text-left text-[12px] font-semibold text-[#475467]">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-center">Update</th>
                  <th className="px-6 py-4 text-center">User</th>
                </tr>
              </thead>
              <tbody>
                {filteredUpdates.slice(0, 5).map((row, index) => (
                  <tr
                    key={row.id}
                    className={index % 2 ? "bg-[#F9FAFB]" : "bg-white"}
                  >
                    <td className="px-6 py-5 font-normal text-[#344054]">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-6 py-5 text-center text-[#475467]">
                      {row.title}
                    </td>
                    <td className="px-6 py-5 text-center text-[#475467]">
                      {row.user}
                    </td>
                  </tr>
                ))}
                {!filteredUpdates.length && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-10 text-center text-[#98A2B3]"
                    >
                      No matching updates.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-end gap-3 border-t border-[#EAECF0] px-6 py-4 text-sm text-[#475467]">
              <span>
                {filteredUpdates.length
                  ? `1 - ${Math.min(10, filteredUpdates.length)} of ${filteredUpdates.length}`
                  : "0 results"}
              </span>
              <button type="button" className="project-page-size-button">
                10 per page
              </button>
              <div className="flex overflow-hidden rounded-lg border border-[#D0D5DD] bg-white">
                <button
                  type="button"
                  className="grid size-9 place-items-center border-r border-[#D0D5DD] text-[#344054]"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="grid size-9 place-items-center text-[#344054]"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "Tickets" && (
        <RecordsPanel
          title="Tickets"
          description="Project tickets linked from the live database."
          items={filteredTickets.map((ticket) => ({
            id: ticket.id,
            title: ticket.title,
            href: `/tickets/${ticket.id}`,
            meta: ticket.assignedTo || ticket.reporter,
          }))}
        />
      )}

      {activeTab === "Modules" && (
        <RecordsPanel
          title="Modules"
          description="Module records are derived from live ticket data."
          items={modules.map((value, index) => ({
            id: `${index}`,
            title: value,
            href: `/modules/new?project=${encodeURIComponent(project.id)}&projectName=${encodeURIComponent(project.name)}`,
            meta: "Derived from ticket data",
          }))}
        />
      )}

      {activeTab === "Team" && (
        <RecordsPanel
          title="Team"
          description="Project team members loaded from the project data."
          items={filteredTeam.map((member) => ({
            id: member.id,
            title: member.name,
            href: `/resources/${member.id}`,
            meta: member.role,
          }))}
          avatar
        />
      )}

      {activeTab === "Files" && (
        <RecordsPanel
          title="Files"
          description="Files and links stored in ticket attachments and ticket form URLs."
          items={links.map((item) => ({
            id: item.id,
            title: item.title,
            href: item.url,
            meta: formatDate(item.date),
          }))}
          external
        />
      )}

      {activeTab === "Timeline" && (
        <RecordsPanel
          title="Timeline"
          description="Timeline is derived from real tickets for this project."
          items={updates.map((item) => ({
            id: item.id,
            title: item.title,
            href: `/tickets/${item.id}`,
            meta: `${formatDate(item.date)} - ${item.user}`,
          }))}
        />
      )}

      {activeTab === "Reports" && (
        <EmptyState
          title="Reports"
          description="Project reporting is not backed by the current database model yet."
        />
      )}

      {activeTab === "Settings" && (
        <EmptyState
          title="Settings"
          description="Project settings can be edited from the project edit page."
          action={
            <Link
              href={`/projects/${project.id}/edit`}
              className="project-action-outline"
            >
              Edit Project
            </Link>
          }
        />
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="project-metric-card">
      <p className="project-metric-label font-semibold">{label}</p>
      <p className="project-metric-value text-3xl font-bold" title={value}>
        {value}
      </p>
    </article>
  );
}

function MetricGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="project-metric-label font-semibold">{label}</p>
      <div className="mt-[10px]">{children}</div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Project["priority"] }) {
  const styles: Record<Project["priority"], string> = {
    Critical: "border-[#FECDCA] bg-[#FEF3F2] text-[#B42318]",
    High: "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]",
    Medium: "border-[#B2DDFF] bg-[#EFF8FF] text-[#175CD3]",
    Low: "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]",
    "Not Assigned": "border-[#D0D5DD] bg-[#F9FAFB] text-[#475467]",
  };

  return (
    <span
      className={cn(
        "inline-flex h-[28px] items-center rounded-2xl border px-3 text-[14px] font-medium leading-5",
        styles[priority],
      )}
    >
      {priority}
    </span>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#EAECF0] bg-white p-8 text-center">
      <FileText className="mx-auto text-[#98A2B3]" />
      <h2 className="mt-3 project-detail-subtitle">{title}</h2>
      <p className="mt-2 text-sm text-[#667085]">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  );
}

function Section({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <section>
      <h2 className="project-detail-field-label">{title}</h2>
      <div className="mt-2 text-[16px] leading-7 text-[#475467]">
        {typeof body === "string" ? <p>{body}</p> : body}
      </div>
    </section>
  );
}

function RecordsPanel({
  title,
  description,
  items,
  avatar = false,
  external = false,
}: {
  title: string;
  description: string;
  items: Array<{ id: string; title: string; href: string; meta?: string }>;
  avatar?: boolean;
  external?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-[#EAECF0] bg-white p-5">
      <h2 className="project-detail-subtitle">{title}</h2>
      <p className="mt-1 text-sm text-[#667085]">{description}</p>

      <div className="mt-5 space-y-3">
        {items.length ? (
          items.map((item) =>
            external ? (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-[#EAECF0] px-4 py-4 hover:bg-[#F9FAFB]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#101828]">
                    {item.title}
                  </p>
                  {item.meta ? (
                    <p className="truncate text-sm text-[#667085]">
                      {item.meta}
                    </p>
                  ) : null}
                </div>
                <ChevronRight size={16} className="shrink-0 text-[#98A2B3]" />
              </a>
            ) : (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between rounded-xl border border-[#EAECF0] px-4 py-4 hover:bg-[#F9FAFB]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {avatar ? (
                    <Avatar name={item.title} className="size-10" />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#101828]">
                      {item.title}
                    </p>
                    {item.meta ? (
                      <p className="truncate text-sm text-[#667085]">
                        {item.meta}
                      </p>
                    ) : null}
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-[#98A2B3]" />
              </Link>
            ),
          )
        ) : (
          <p className="py-10 text-center text-sm text-[#98A2B3]">
            No records to show.
          </p>
        )}
      </div>
    </section>
  );
}

function formatProjectDate(value: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  const today = new Date();
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return `Today, ${date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").trim();
}
