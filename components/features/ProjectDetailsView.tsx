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
import type { Project, Ticket, TicketAttachment, User } from "@/types";

type ProjectLink = {
  title: string;
  href: string;
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

  const formData = (project.formData ?? {}) as Record<string, unknown>;
  const projectTickets = useMemo(
    () => tickets.filter((ticket) => ticket.project === project.name),
    [project.name, tickets],
  );

  const teamMembers = useMemo(() => {
    if (project.teamMembers?.length) return project.teamMembers;

    const ids = Array.isArray(formData.teamIds)
      ? formData.teamIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [];

    return ids
      .map((id) => users.find((user) => user.id === id))
      .filter((user): user is User => Boolean(user))
      .map((user) => ({
        id: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar ?? null,
      }));
  }, [formData.teamIds, project.teamMembers, users]);

  const attachments = useMemo<TicketAttachment[]>(
    () =>
      Array.isArray(formData.attachments)
        ? formData.attachments.filter((value): value is TicketAttachment =>
            Boolean(
              value &&
              typeof value === "object" &&
              "id" in value &&
              "name" in value &&
              "url" in value,
            ),
          )
        : [],
    [formData.attachments],
  );

  const projectLinks = useMemo<ProjectLink[]>(() => {
    const links = formData.links;
    if (!links || typeof links !== "object") return [];

    return [
      {
        title: "Staging",
        href: String((links as Record<string, unknown>).staging ?? ""),
      },
      {
        title: "Live",
        href: String((links as Record<string, unknown>).live ?? ""),
      },
      {
        title: "Figma",
        href: String((links as Record<string, unknown>).figma ?? ""),
      },
      {
        title: "GitHub",
        href: String((links as Record<string, unknown>).github ?? ""),
      },
    ].filter((item) => item.href.trim().length > 0);
  }, [formData.links]);

  const modules = useMemo(() => {
    const values = [
      typeof formData.projectType === "string" ? formData.projectType : "",
      typeof formData.moduleName === "string" ? formData.moduleName : "",
      typeof formData.subModule === "string" ? formData.subModule : "",
      typeof formData.department === "string" ? formData.department : "",
    ];

    return Array.from(
      new Set(values.map((value) => value.trim()).filter(Boolean)),
    );
  }, [
    formData.department,
    formData.moduleName,
    formData.projectType,
    formData.subModule,
  ]);

  const openTickets = project.openTickets ?? projectTickets.length;
  const search = query.trim().toLowerCase();

  const filteredTickets = search
    ? projectTickets.filter((ticket) =>
        `${ticket.title} ${ticket.status} ${ticket.assignedTo} ${ticket.reporter}`
          .toLowerCase()
          .includes(search),
      )
    : projectTickets;

  const filteredTeam = search
    ? teamMembers.filter((member) =>
        `${member.name} ${member.role}`.toLowerCase().includes(search),
      )
    : teamMembers;

  const filteredAttachments = search
    ? attachments.filter((attachment) =>
        `${attachment.name} ${attachment.mimeType}`
          .toLowerCase()
          .includes(search),
      )
    : attachments;

  const filteredLinks = search
    ? projectLinks.filter((link) =>
        `${link.title} ${link.href}`.toLowerCase().includes(search),
      )
    : projectLinks;

  const filteredModules = search
    ? modules.filter((module) => module.toLowerCase().includes(search))
    : modules;

  const latestUpdates = projectTickets.slice(0, 5);

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
              <span className="font-bold text-[#344054]">Client:</span>{" "}
              {project.client}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/projects/${project.id}/edit`}
              className="project-action-outline"
            >
              Edit Project
            </Link>
            <Link href="/projects/new" className="project-action-outline">
              Create New Project
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
          <div className="grid h-full grid-cols-2 gap-2">
            <MetricGroup label="Status">
              <ProjectStatus
                status={project.status}
                subtle
                size="sm"
                className="!h-[24px] !min-w-0 !max-w-[112px] !px-2.5 !text-[12px]"
              />
            </MetricGroup>

            <MetricGroup label="Priority">
              <PriorityBadge priority={project.priority} compact />
            </MetricGroup>
          </div>
        </article>

        <MetricCard label="Open Tickets" value={String(openTickets)} />

        <MetricCard label="Team Members" value={`${teamMembers.length}`} />

        <MetricCard label="Progress %" value={`${project.progress ?? 0}%`} />

        <MetricCard
          label="Last Updated"
          value={formatProjectDate(project.lastUpdated)}
        />
      </section>

      <ProjectTabs value={activeTab} onValueChange={setActiveTab} />

      {activeTab === "Overview" && (
        <div className="space-y-6">
          <section>
            <h2 className="project-detail-field-label">Project Brief</h2>
            <p className="mt-2 text-[16px] leading-7 text-[#475467]">
              {project.description?.trim() ||
                "Project brief is not stored in the current database record."}
            </p>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title="Project Type"
              body={
                typeof formData.projectType === "string" &&
                formData.projectType.trim().length
                  ? formData.projectType
                  : "No project type saved."
              }
            />
            <Section
              title="Department"
              body={
                typeof formData.department === "string" &&
                formData.department.trim().length
                  ? formData.department
                  : "No department saved."
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title="Module"
              body={
                typeof formData.moduleName === "string" &&
                formData.moduleName.trim().length
                  ? formData.moduleName
                  : "No module saved."
              }
            />
            <Section
              title="Sub Module"
              body={
                typeof formData.subModule === "string" &&
                formData.subModule.trim().length
                  ? formData.subModule
                  : "No sub module saved."
              }
            />
          </div>

          <Section
            title="Project Links"
            body={
              filteredLinks.length ? (
                <div className="space-y-2">
                  {filteredLinks.map((link) => (
                    <a
                      key={link.title}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-[16px] leading-7 text-[#475467] underline decoration-[#D0D5DD] underline-offset-4 hover:text-[#0284C7]"
                    >
                      {link.title}
                    </a>
                  ))}
                </div>
              ) : (
                "No project links saved."
              )
            }
          />

          <Section
            title="Internal Notes"
            body={
              typeof formData.internalNotes === "string" &&
              formData.internalNotes.trim().length
                ? formData.internalNotes
                : "No internal notes saved."
            }
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
                {latestUpdates.map((row, index) => (
                  <tr
                    key={row.id}
                    className={index % 2 ? "bg-[#F9FAFB]" : "bg-white"}
                  >
                    <td className="px-6 py-5 font-normal text-[#344054]">
                      {formatDate(row.created)}
                    </td>
                    <td className="px-6 py-5 text-center text-[#475467]">
                      {row.title}
                    </td>
                    <td className="px-6 py-5 text-center text-[#475467]">
                      {row.assignedTo || row.reporter || "-"}
                    </td>
                  </tr>
                ))}
                {!latestUpdates.length && (
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
          description="Module records are loaded from the project form data."
          items={filteredModules.map((module, index) => ({
            id: `${index}-${module}`,
            title: module,
            href: `/projects/${project.id}/edit`,
            meta: "Saved on this project",
          }))}
        />
      )}

      {activeTab === "Team" && (
        <RecordsPanel
          title="Team"
          description="Project team members are stored in the project data."
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
          description="Files and links are stored in the project form data."
          items={filteredAttachments.map((attachment) => ({
            id: attachment.id,
            title: attachment.name,
            href: attachment.url,
            meta: formatDate(attachment.uploadedAt),
          }))}
          external
          footer={
            filteredLinks.length ? (
              <div className="mt-5 border-t border-[#EAECF0] pt-5">
                <h3 className="project-detail-field-label">Saved Links</h3>
                <div className="mt-3 space-y-2">
                  {filteredLinks.map((link) => (
                    <a
                      key={link.title}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-[16px] leading-7 text-[#475467] underline decoration-[#D0D5DD] underline-offset-4 hover:text-[#0284C7]"
                    >
                      {link.title}
                    </a>
                  ))}
                </div>
              </div>
            ) : null
          }
        />
      )}

      {activeTab === "Timeline" && (
        <RecordsPanel
          title="Timeline"
          description="Timeline is derived from real tickets for this project."
          items={projectTickets.map((ticket) => ({
            id: ticket.id,
            title: ticket.title,
            href: `/tickets/${ticket.id}`,
            meta: `${formatDate(ticket.created)} - ${ticket.assignedTo || ticket.reporter || "-"}`,
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
      <p className="project-metric-value font-semibold text-2xl" title={value}>
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
    <div className="min-w-0 overflow-hidden">
      <p className="project-metric-label font-semibold">{label}</p>

      <div className="mt-2 flex min-w-0 items-center">{children}</div>
    </div>
  );
}

function PriorityBadge({
  priority,
  compact = false,
}: {
  priority: Project["priority"];
  compact?: boolean;
}) {
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
        "inline-flex items-center justify-center whitespace-nowrap rounded-2xl border font-medium",
        compact
          ? "h-[24px] max-w-[112px] px-2.5 text-[12px] leading-[18px]"
          : "h-[28px] px-3 text-[14px] leading-5",
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
  footer,
}: {
  title: string;
  description: string;
  items: Array<{ id: string; title: string; href: string; meta?: string }>;
  avatar?: boolean;
  external?: boolean;
  footer?: React.ReactNode;
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

      {footer ? <div>{footer}</div> : null}
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
