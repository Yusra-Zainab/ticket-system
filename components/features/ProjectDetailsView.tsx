"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, FileText, X } from "lucide-react";

import ProjectTabs, {
  type ProjectTab,
  projectTabs,
} from "@/components/features/ProjectTabs";
import ProjectStatus from "@/components/features/ProjectStatus";
import styles from "@/components/features/ProjectDetailsView.module.css";
import { usePageSearch } from "@/components/providers/PageSearchProvider";
import { Avatar } from "@/components/ui/Avatar";
import { cn, formatDate, sanitizeRichText } from "@/lib/utils";
import { normalizeProjectModules } from "@/lib/projectModules";

import type {
  Project,
  ProjectModuleDefinition,
  ProjectPriority,
  Ticket,
  TicketAttachment,
  User,
} from "@/types";

type ProjectLink = {
  title: string;
  href: string;
};

export type ProjectModuleTicketStat = {
  module: string;
  subModule: string;
  openTickets: number;
};

type TimelineItem = {
  id: string;
  date: string;
  title: string;
  user: string;
  status: string;

  kind: "Project" | "Ticket" | "Deadline";

  href?: string;

  sort: number;
};

export type ProjectDetailsMode = "admin" | "client" | "resource";

export type ProjectDetailsViewProps = {
  project: Project;

  tickets: Ticket[];

  users: User[];

  showSavedToast?: boolean;

  initialTab?: string;

  mode?: ProjectDetailsMode;

  projectBaseHref?: string;

  ticketBaseHref?: string;

  resourceBaseHref?: string;

  visibleTabs?: readonly ProjectTab[];

  allowProjectEdit?: boolean;

  allowProjectCreate?: boolean;

  allowTicketCreate?: boolean;

  moduleTicketStats?: ProjectModuleTicketStat[];
};

export default function ProjectDetailsView({
  project,

  tickets,

  users,

  showSavedToast = false,

  initialTab,

  mode = "admin",

  projectBaseHref = "/projects",

  ticketBaseHref = "/tickets",

  resourceBaseHref = "/resources",

  visibleTabs = projectTabs,

  allowProjectEdit = mode === "admin",

  allowProjectCreate = mode === "admin",

  allowTicketCreate = true,

  moduleTicketStats = [],
}: ProjectDetailsViewProps) {
  const router = useRouter();

  const pathname = usePathname();

  const searchParams = useSearchParams();

  const { query } = usePageSearch();

  const normalizeTab = (value?: string): ProjectTab => {
    const requested = projectTabs.find(
      (tab) =>
        tab.toLowerCase() ===
        String(value ?? "")
          .trim()
          .toLowerCase(),
    );

    return requested && visibleTabs.includes(requested)
      ? requested
      : (visibleTabs[0] ?? "Overview");
  };

  const requestedInitialTab =
    initialTab ?? searchParams.get("tab") ?? undefined;

  const [activeTab, setActiveTab] = useState<ProjectTab>(() =>
    normalizeTab(requestedInitialTab),
  );

  const [toastDismissed, setToastDismissed] = useState(false);

  const toast =
    showSavedToast && !toastDismissed ? "Project saved successfully." : "";

  const formData = (project.formData ?? {}) as Record<string, unknown>;

  /*
   * Keep only tickets belonging
   * to this project.
   */
  const projectTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        const ticketProjectId = (
          ticket.formData as Record<string, unknown> | undefined
        )?.projectId;

        return (
          ticket.project === project.name ||
          String(ticketProjectId ?? "") === project.id
        );
      }),
    [project.id, project.name, tickets],
  );

  /*
   * Team
   */
  const teamMembers = useMemo(() => {
    if (project.teamMembers?.length) {
      return project.teamMembers;
    }

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

  /*
   * Attachments
   */
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

  /*
   * Project links
   */
  const projectLinks = useMemo<ProjectLink[]>(() => {
    const links = formData.links;

    if (!links || typeof links !== "object") {
      return [];
    }

    const record = links as Record<string, unknown>;

    return [
      {
        title: "Staging",

        href: String(record.staging ?? ""),
      },

      {
        title: "Live",

        href: String(record.live ?? ""),
      },

      {
        title: "Figma",

        href: String(record.figma ?? ""),
      },

      {
        title: "GitHub",

        href: String(record.github ?? ""),
      },
    ].filter((item) => item.href.trim().length > 0);
  }, [formData.links]);

  /*
   * Modules
   */
  const projectModules = useMemo(
    () => normalizeProjectModules(project),
    [project],
  );

  const openTickets = project.openTickets ?? projectTickets.length;

  const search = query.trim().toLowerCase();

  /*
   * Search is intentionally NOT
   * applied to Modules.
   */
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

  /*
   * =======================================================
   * TIMELINE
   * =======================================================
   *
   * This is no longer rendered through RecordsPanel.
   *
   * It has its own proper timeline layout.
   */
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    const add = (item: Omit<TimelineItem, "sort">) => {
      const sort = new Date(item.date).getTime();

      if (!Number.isFinite(sort)) {
        return;
      }

      items.push({
        ...item,

        sort,
      });
    };

    /*
     * Project start
     */
    if (project.startDate) {
      add({
        id: `project-${project.id}-start`,

        date: project.startDate,

        title: "Project started",

        user: "System",

        status: project.status,

        kind: "Project",
      });
    }

    /*
     * Project updated
     */
    if (project.lastUpdated) {
      add({
        id: `project-${project.id}-updated`,

        date: project.lastUpdated,

        title: "Project details updated",

        user: "System",

        status: project.status,

        kind: "Project",
      });
    }

    /*
     * Ticket events
     */
    for (const ticket of projectTickets) {
      if (ticket.created) {
        add({
          id: `ticket-${ticket.id}-created`,

          date: ticket.created,

          title: `Ticket created: ${ticket.title}`,

          user: ticket.reporter || ticket.assignedTo || "System",

          status: ticket.status,

          kind: "Ticket",

          href: `${ticketBaseHref}/${ticket.id}`,
        });
      }

      /*
       * Do not show an updated
       * event when created/updated
       * timestamps are identical.
       */
      if (
        ticket.updatedAt &&
        !sameTimestamp(ticket.updatedAt, ticket.created)
      ) {
        add({
          id: `ticket-${ticket.id}-updated`,

          date: ticket.updatedAt,

          title: `Ticket updated: ${ticket.title}`,

          user: ticket.assignedTo || ticket.reporter || "System",

          status: ticket.status,

          kind: "Ticket",

          href: `${ticketBaseHref}/${ticket.id}`,
        });
      }

      if (ticket.dueDate) {
        add({
          id: `ticket-${ticket.id}-due`,

          date: ticket.dueDate,

          title: `Ticket deadline: ${ticket.title}`,

          user: ticket.assignedTo || ticket.reporter || "System",

          status: ticket.status,

          kind: "Deadline",

          href: `${ticketBaseHref}/${ticket.id}`,
        });
      }
    }

    /*
     * Project deadline last so if
     * dates are identical it remains
     * grouped near the final milestone.
     */
    if (project.dueDate) {
      add({
        id: `project-${project.id}-due`,

        date: project.dueDate,

        title: `${project.name} deadline`,

        user: "System",

        status: "Due date",

        kind: "Deadline",
      });
    }

    /*
     * Chronological timeline.
     */
    return items.sort((left, right) => left.sort - right.sort);
  }, [
    project.dueDate,
    project.id,
    project.lastUpdated,
    project.name,
    project.startDate,
    project.status,
    projectTickets,
    ticketBaseHref,
  ]);

  const filteredTimeline = search
    ? timelineItems.filter((item) =>
        `${item.title} ${item.user} ${item.status} ${item.kind}`
          .toLowerCase()
          .includes(search),
      )
    : timelineItems;

  const latestUpdates = useMemo(
    () =>
      [...projectTickets]
        .sort(
          (left, right) =>
            dateTime(right.updatedAt || right.created) -
            dateTime(left.updatedAt || left.created),
        )
        .slice(0, 5),
    [projectTickets],
  );

  useEffect(() => {
    setActiveTab(normalizeTab(requestedInitialTab));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedInitialTab]);

  const handleTabChange = (tab: ProjectTab) => {
    setActiveTab(tab);

    const params = new URLSearchParams(searchParams.toString());

    if (tab === "Overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab.toLowerCase());
    }

    router.replace(
      params.size ? `${pathname}?${params.toString()}` : pathname,
      {
        scroll: false,
      },
    );
  };

  const createTicketHref = `${ticketBaseHref}/new?project=${encodeURIComponent(
    project.name,
  )}&projectId=${encodeURIComponent(project.id)}`;

  return (
    <div className={cn(styles.root, "project-details-view space-y-6 pb-28")}>
      {/* ===================================================
          HEADER
          =================================================== */}

      <header className="project-details-header sticky top-0 z-20 -mx-3 bg-white/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1
              className="text-[30px] font-bold leading-[38px] text-[#101828]"
              style={{
                fontFamily: "Satoshi, Arial, sans-serif",
              }}
            >
              {project.name}
            </h1>

            <p className="mt-2 text-[16px] font-normal leading-6 text-[#475467]">
              <span className="font-bold text-[#344054]">Client:</span>{" "}
              {project.client || "—"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {allowProjectEdit ? (
              <Link
                href={`${projectBaseHref}/${project.id}/edit`}
                className="project-action-outline"
              >
                Edit Project
              </Link>
            ) : null}

            {allowProjectCreate ? (
              <Link
                href={`${projectBaseHref}/new`}
                className="project-action-outline"
              >
                Create New Project
              </Link>
            ) : null}

            {allowTicketCreate ? (
              <Link
                href={createTicketHref}
                className="project-action-outline whitespace-nowrap"
              >
                + Create a New Ticket
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {/* ===================================================
          METRICS
          =================================================== */}

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

        <MetricCard label="Team Members" value={String(teamMembers.length)} />

        <MetricCard label="Progress %" value={`${project.progress ?? 0}%`} />

        <MetricCard
          label="Last Updated"
          value={formatProjectDate(project.lastUpdated)}
        />
      </section>

      {/* ===================================================
          TABS
          =================================================== */}

      <ProjectTabs
        value={activeTab}
        onValueChange={handleTabChange}
        tabs={visibleTabs}
      />

      {/* ===================================================
          OVERVIEW
          =================================================== */}

      {activeTab === "Overview" && (
        <div className="space-y-6">
          <section>
            <h2 className="project-detail-field-label">Project Brief</h2>

            {project.description?.trim() ? (
              <div
                className="prose-ticket mt-2 text-[16px] leading-7 text-[#475467]"
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichText(project.description),
                }}
              />
            ) : (
              <p className="mt-2 text-[16px] leading-7 text-[#475467]">
                No project brief saved.
              </p>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title="Project Type"
              body={textValue(formData.projectType, "No project type saved.")}
            />

            <Section
              title="Department"
              body={textValue(formData.department, "No department saved.")}
            />
          </div>

          {/* Overview also uses the proper modules table */}

          <Section
            title="Modules"
            body={
              <ModuleTable
                modules={projectModules}
                tickets={projectTickets}
                moduleTicketStats={moduleTicketStats}
                compact
              />
            }
          />

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

          {/* Never expose internal notes to client/resource portals */}

          {mode === "admin" ? (
            <Section
              title="Internal Notes"
              body={textValue(
                formData.internalNotes,
                "No internal notes saved.",
              )}
            />
          ) : null}

          <section className="project-detail-table-frame">
            <div className="border-b border-[#EAECF0] px-6 py-4">
              <h2 className="project-detail-subtitle">Latest Updates</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="project-detail-data-table project-update-table">
                <thead>
                  <tr>
                    <th>Date</th>

                    <th>Update</th>

                    <th>User</th>
                  </tr>
                </thead>

                <tbody>
                  {latestUpdates.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.updatedAt || row.created)}</td>

                      <td className="project-detail-primary-cell">
                        {row.title}
                      </td>

                      <td>{row.assignedTo || row.reporter || "—"}</td>
                    </tr>
                  ))}

                  {!latestUpdates.length ? (
                    <tr>
                      <td colSpan={3} className="project-detail-empty-cell">
                        No updates to show.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ===================================================
          TICKETS
          =================================================== */}

      {activeTab === "Tickets" && (
        <RecordsPanel
          title="Tickets"
          description="Project tickets linked from the live database."
          items={filteredTickets.map((ticket) => ({
            id: ticket.id,

            title: ticket.title,

            href: `${ticketBaseHref}/${ticket.id}`,

            meta: ticket.assignedTo || ticket.reporter,
          }))}
        />
      )}

      {/* ===================================================
          MODULES
          =================================================== */}

      {activeTab === "Modules" && (
        <section className={styles.tabPanel}>
          <div className={styles.tabHeading}>
            <div>
              <h2>Modules</h2>

              <p>
                Module and submodule structure with live open-ticket activity.
              </p>
            </div>

            <ModuleSummary
              modules={projectModules}
              tickets={projectTickets}
              moduleTicketStats={moduleTicketStats}
            />
          </div>

          <ModuleTable
            modules={projectModules}
            tickets={projectTickets}
            moduleTicketStats={moduleTicketStats}
          />
        </section>
      )}

      {/* ===================================================
          TEAM
          =================================================== */}

      {activeTab === "Team" && (
        <RecordsPanel
          title="Team"
          description="Project team members are stored in the project data."
          items={filteredTeam.map((member) => ({
            id: member.id,

            title: member.name,

            href: resourceBaseHref
              ? `${resourceBaseHref}/${member.id}`
              : undefined,

            meta: member.role,

            imageSrc: member.avatar,
          }))}
          avatar
        />
      )}

      {/* ===================================================
          FILES
          =================================================== */}

      {activeTab === "Files" && (
        <RecordsPanel
          title="Files"
          description="Files and links are stored in the project data."
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

      {/* ===================================================
          TIMELINE
          =================================================== */}

      {activeTab === "Timeline" && (
        <section className={styles.tabPanel}>
          <div className={styles.tabHeading}>
            <div>
              <h2>Timeline</h2>

              <p>
                Project milestones, ticket activity and deadlines in
                chronological order.
              </p>
            </div>

            <div className={styles.timelineSummary}>
              <span>{filteredTimeline.length}</span>

              <small>events</small>
            </div>
          </div>

          <TimelineTable items={filteredTimeline} />
        </section>
      )}

      {/* ===================================================
          REPORTS
          =================================================== */}

      {activeTab === "Reports" && (
        <EmptyState
          title="Reports"
          description="Project reporting is not backed by the current database model yet."
        />
      )}

      {/* ===================================================
          SETTINGS
          =================================================== */}

      {activeTab === "Settings" && (
        <EmptyState
          title="Settings"
          description={
            allowProjectEdit
              ? "Project settings can be edited from the project edit page."
              : "Project settings are managed by an administrator."
          }
          action={
            allowProjectEdit ? (
              <Link
                href={`${projectBaseHref}/${project.id}/edit`}
                className="project-action-outline"
              >
                Edit Project
              </Link>
            ) : undefined
          }
        />
      )}

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="ticket-toast ticket-toast-success"
        >
          <p className="text-sm font-medium">{toast}</p>

          <button
            type="button"
            className="ml-auto"
            onClick={() => setToastDismissed(true)}
            aria-label="Dismiss"
          >
            <X size={17} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* =========================================================
   SIMPLE HELPERS
   ========================================================= */

function textValue(
  value: unknown,

  fallback: string,
) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function MetricCard({
  label,

  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <article className="project-metric-card">
      <p className="project-metric-label font-semibold">{label}</p>

      <p className="project-metric-value text-2xl font-semibold" title={value}>
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

function normalizePriority(priority?: string | null): ProjectPriority {
  switch (priority) {
    case "Critical":

    case "High":

    case "Medium":

    case "Low":

    case "Not Assigned":
      return priority;

    default:
      return "Not Assigned";
  }
}

function PriorityBadge({
  priority,

  compact = false,
}: {
  priority?: string | null;

  compact?: boolean;
}) {
  const normalized = normalizePriority(priority);

  /*
   * Do NOT name this variable `styles`.
   * styles is our imported CSS module.
   */
  const badgeStyles: Record<ProjectPriority, string> = {
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

        badgeStyles[normalized],
      )}
    >
      {normalized}
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

      <h2 className="project-detail-subtitle mt-3">{title}</h2>

      <p className="mt-2 text-sm text-[#667085]">{description}</p>

      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  );
}

/* =========================================================
   MODULE TABLE
   ========================================================= */

type ModuleRow = {
  id: string;

  module: string;

  subModule: string;

  openTickets: number;

  status: "Active" | "Inactive";
};

function buildModuleRows(
  modules: ProjectModuleDefinition[],

  tickets: Ticket[],

  moduleTicketStats: ProjectModuleTicketStat[],
): ModuleRow[] {
  const normalizedStats = moduleTicketStats.map((stat) => ({
    ...stat,

    moduleKey: normalizeModuleKey(stat.module),

    subModuleKey: normalizeModuleKey(stat.subModule),
  }));

  return modules.flatMap((module) => {
    const moduleName = module.name.trim();

    /*
     * Still create one row for
     * modules without submodules.
     */
    const subModules = module.subModules.length
      ? module.subModules
      : [
          {
            id: `${module.id}-empty`,

            name: "",
          },
        ];

    return subModules.map((subModule) => {
      const subModuleName = subModule.name.trim();

      const moduleKey = normalizeModuleKey(moduleName);

      const subModuleKey = normalizeModuleKey(subModuleName);

      /*
       * Portal pages receive DB-backed
       * module stats through the
       * moduleTicketStats prop.
       */
      const hasPortalStats = moduleTicketStats.length > 0;

      const portalOpenTickets = normalizedStats.reduce(
        (
          total,

          stat,
        ) => {
          if (stat.moduleKey !== moduleKey) {
            return total;
          }

          /*
           * If this module has no
           * configured submodule,
           * aggregate all ticket
           * counts for the module.
           */
          if (subModuleName && stat.subModuleKey !== subModuleKey) {
            return total;
          }

          return total + stat.openTickets;
        },
        0,
      );

      /*
       * Admin tickets already retain
       * module / subModule in
       * ticket.formData.
       */
      const localOpenTickets = tickets.filter((ticket) =>
        ticketMatchesModule(ticket, moduleName, subModuleName),
      ).length;

      const openTickets = hasPortalStats ? portalOpenTickets : localOpenTickets;

      return {
        id: `${module.id}:${subModule.id}`,

        module: moduleName || "—",

        subModule: subModuleName || "—",

        openTickets,

        /*
         * No separate module status
         * exists in the current DB.
         *
         * Active/Inactive is therefore
         * based on actual OPEN ticket
         * activity.
         */
        status: openTickets > 0 ? "Active" : "Inactive",
      };
    });
  });
}

function ModuleSummary({
  modules,

  tickets,

  moduleTicketStats,
}: {
  modules: ProjectModuleDefinition[];

  tickets: Ticket[];

  moduleTicketStats: ProjectModuleTicketStat[];
}) {
  const rows = buildModuleRows(modules, tickets, moduleTicketStats);

  const totalOpenTickets = rows.reduce(
    (
      total,

      row,
    ) => total + row.openTickets,
    0,
  );

  const activeRows = rows.filter((row) => row.status === "Active").length;

  return (
    <div className={styles.moduleSummary}>
      <SummaryStat value={String(rows.length)} label="Module rows" />

      <span className={styles.summaryDivider} aria-hidden="true" />

      <SummaryStat value={String(totalOpenTickets)} label="Open tickets" />

      <span className={styles.summaryDivider} aria-hidden="true" />

      <SummaryStat value={String(activeRows)} label="Active" />
    </div>
  );
}

function SummaryStat({
  value,

  label,
}: {
  value: string;

  label: string;
}) {
  return (
    <div className={styles.summaryStat}>
      <span className={styles.summaryValue}>{value}</span>

      <span className={styles.summaryLabel}>{label}</span>
    </div>
  );
}

function ModuleTable({
  modules,

  tickets,

  moduleTicketStats,

  compact = false,
}: {
  modules: ProjectModuleDefinition[];

  tickets: Ticket[];

  moduleTicketStats: ProjectModuleTicketStat[];

  compact?: boolean;
}) {
  const rows = buildModuleRows(modules, tickets, moduleTicketStats);

  return (
    <div
      className={cn(
        styles.tableFrame,

        compact && styles.tableFrameCompact,
      )}
    >
      <div className={styles.tableScroll}>
        <table className={styles.moduleTable}>
          <colgroup>
            <col className={styles.moduleColumn} />

            <col className={styles.subModuleColumn} />

            <col className={styles.openTicketsColumn} />

            <col className={styles.statusColumn} />
          </colgroup>

          <thead>
            <tr>
              <th>Module</th>

              <th>SubModule</th>

              <th>Open Tickets</th>

              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className={styles.moduleName}>{row.module}</span>
                </td>

                <td>
                  <span className={styles.subModuleName}>{row.subModule}</span>
                </td>

                <td className={styles.centerCell}>
                  <span className={styles.openTicketValue}>
                    {row.openTickets}
                  </span>
                </td>

                <td className={styles.centerCell}>
                  <ModuleActivityBadge status={row.status} />
                </td>
              </tr>
            ))}

            {!rows.length ? (
              <tr>
                <td colSpan={4} className={styles.emptyCell}>
                  No modules have been saved for this project.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function normalizeModuleKey(value: string) {
  return value.trim().toLowerCase();
}

function ticketMatchesModule(
  ticket: Ticket,

  moduleName: string,

  subModuleName: string,
) {
  const data = (ticket.formData ?? {}) as Record<string, unknown>;

  const ticketModule =
    typeof data.module === "string" ? normalizeModuleKey(data.module) : "";

  const ticketSubModule =
    typeof data.subModule === "string"
      ? normalizeModuleKey(data.subModule)
      : "";

  if (ticketModule !== normalizeModuleKey(moduleName)) {
    return false;
  }

  /*
   * A module without a configured
   * submodule counts every ticket
   * assigned to that module.
   */
  if (!subModuleName.trim()) {
    return true;
  }

  return ticketSubModule === normalizeModuleKey(subModuleName);
}

function ModuleActivityBadge({ status }: { status: "Active" | "Inactive" }) {
  return (
    <span
      className={cn(
        styles.moduleStatus,

        status === "Active"
          ? styles.moduleStatusActive
          : styles.moduleStatusInactive,
      )}
    >
      <span className={styles.moduleStatusDot} aria-hidden="true" />

      {status}
    </span>
  );
}

/* =========================================================
   TIMELINE
   ========================================================= */

function TimelineTable({ items }: { items: TimelineItem[] }) {
  return (
    <div className={styles.timelineFrame}>
      {items.map(
        (
          item,

          index,
        ) => (
          <article key={item.id} className={styles.timelineRow}>
            <div className={styles.timelineDateColumn}>
              <span className={styles.timelineDate}>
                {formatTimelineDate(item.date)}
              </span>
            </div>

            <div className={styles.timelineMarkerColumn} aria-hidden="true">
              <span
                className={cn(
                  styles.timelineMarker,

                  item.kind === "Project"
                    ? styles.timelineMarkerProject
                    : item.kind === "Deadline"
                      ? styles.timelineMarkerDeadline
                      : styles.timelineMarkerTicket,
                )}
              />

              {index < items.length - 1 ? (
                <span className={styles.timelineLine} />
              ) : null}
            </div>

            <div className={styles.timelineBody}>
              <div className={styles.timelineTagRow}>
                <TimelineKindBadge kind={item.kind} />

                <TimelineStatusBadge status={item.status} />
              </div>

              <div className={styles.timelineTitle}>
                {item.href ? (
                  <Link href={item.href} className={styles.timelineLink}>
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
              </div>

              <div className={styles.timelineMeta}>
                <span className={styles.timelineMetaLabel}>By</span>

                <span className={styles.timelineUser}>
                  {item.user || "System"}
                </span>
              </div>
            </div>
          </article>
        ),
      )}

      {!items.length ? (
        <div className={styles.timelineEmpty}>
          No timeline activity is available yet.
        </div>
      ) : null}
    </div>
  );
}

function TimelineKindBadge({ kind }: { kind: TimelineItem["kind"] }) {
  return (
    <span
      className={cn(
        styles.timelineKindTag,

        kind === "Project"
          ? styles.timelineKindProject
          : kind === "Deadline"
            ? styles.timelineKindDeadline
            : styles.timelineKindTicket,
      )}
    >
      {kind}
    </span>
  );
}

function TimelineStatusBadge({ status }: { status: string }) {
  const normalized = status.trim() || "Not Assigned";

  const lower = normalized.toLowerCase();

  const tone =
    lower.includes("closed") ||
    lower.includes("resolved") ||
    lower.includes("completed")
      ? styles.timelineStatusSuccess
      : lower.includes("critical") ||
          lower.includes("blocked") ||
          lower.includes("delayed") ||
          lower.includes("cancel") ||
          lower.includes("overdue")
        ? styles.timelineStatusDanger
        : lower.includes("active") ||
            lower.includes("open") ||
            lower.includes("assigned") ||
            lower.includes("review") ||
            lower.includes("qa") ||
            lower.includes("validation") ||
            lower.includes("progress")
          ? styles.timelineStatusInfo
          : styles.timelineStatusNeutral;

  return (
    <span
      className={cn(
        styles.timelineStatusTag,

        tone,
      )}
      title={normalized}
    >
      {normalized}
    </span>
  );
}

/* =========================================================
   RECORD PANELS
   ========================================================= */

function Section({
  title,

  body,
}: {
  title: string;

  body: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="project-detail-field-label">{title}</h2>

      <div className="mt-2 text-[16px] leading-7 text-[#475467]">
        {typeof body === "string" ? <p>{body}</p> : body}
      </div>
    </section>
  );
}

type RecordItem = {
  id: string;

  title: string;

  href?: string;

  meta?: string;

  imageSrc?: string | null;
};

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

  items: RecordItem[];

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
          items.map((item) => {
            const content = (
              <>
                <div className="flex min-w-0 items-center gap-3">
                  {avatar ? (
                    <Avatar
                      name={item.title}
                      src={item.imageSrc}
                      className="size-10"
                    />
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

                {item.href ? (
                  <ChevronRight size={16} className="shrink-0 text-[#98A2B3]" />
                ) : null}
              </>
            );

            const className =
              "flex items-center justify-between rounded-xl border border-[#EAECF0] px-4 py-4 hover:bg-[#F9FAFB]";

            if (!item.href) {
              return (
                <div key={item.id} className={className}>
                  {content}
                </div>
              );
            }

            if (external) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className={className}
                >
                  {content}
                </a>
              );
            }

            return (
              <Link key={item.id} href={item.href} className={className}>
                {content}
              </Link>
            );
          })
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

/* =========================================================
   DATES
   ========================================================= */

function dateTime(value: string) {
  const result = new Date(value).getTime();

  return Number.isFinite(result) ? result : 0;
}

function sameTimestamp(
  left: string,

  right: string,
) {
  const leftTime = dateTime(left);

  const rightTime = dateTime(right);

  return leftTime > 0 && rightTime > 0 && leftTime === rightTime;
}

function formatTimelineDate(value: string) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  const hasTime = !/^\d{4}-\d{2}-\d{2}$/.test(value.trim());

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",

    day: "numeric",

    year: "numeric",

    ...(hasTime
      ? {
          hour: "numeric",

          minute: "2-digit",
        }
      : {}),
  }).format(date);
}

function formatProjectDate(value: string) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

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

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",

    day: "numeric",

    year: "numeric",

    hour: "numeric",

    minute: "2-digit",
  }).format(date);
}
