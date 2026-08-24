"use client";

import Link from "next/link";

import { ArrowRight, Check, ChevronDown, Plus } from "lucide-react";

import { useMemo, useState } from "react";

import ProjectStatus from "@/components/features/ProjectStatus";

import { profileLabelToTimeZone } from "@/lib/profileUtils";
import { cn } from "@/lib/utils";

import PageHeader from "@/components/ui/PageHeader";

import type { ClientListRow, Project, ResourceListRow, Ticket } from "@/types";

type Props = {
  projects: Project[];
  tickets: Ticket[];
  resources: ResourceListRow[];
  clients: ClientListRow[];
  now: number;
  timeZone: string;
};

type PriorityLabel = "Critical" | "High" | "Medium" | "Low" | "Not Assigned";

const priorityMap: Record<number, PriorityLabel> = {
  1: "Critical",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Not Assigned",
};

export default function AdminDashboard({
  projects,
  tickets,
  resources,
  clients,
  now,
  timeZone,
}: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState(
    projects[0]?.id ?? "",
  );

  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0];

  /* =====================================================
     ALERT BOARD
     ===================================================== */

  const activeClients = clients.filter(
    (client) => client.status === "Active",
  ).length;

  const openTickets = tickets.filter(
    (ticket) =>
      !["Closed", "Resolved", "Cancelled"].includes(String(ticket.status)),
  );

  const criticalTickets = tickets.filter(
    (ticket) =>
      ticket.priority === 1 ||
      ticket.status === "Critical" ||
      ticket.tags.some((tag) => tag.toLowerCase() === "critical"),
  );

  const overdueTickets = tickets.filter((ticket) => {
    if (!ticket.dueDate) {
      return false;
    }

    const deadline = new Date(`${ticket.dueDate}T23:59:59`).getTime();

    return (
      Number.isFinite(deadline) &&
      deadline < now &&
      !["Closed", "Resolved", "Cancelled"].includes(String(ticket.status))
    );
  });

  /* =====================================================
     SELECTED PROJECT
     ===================================================== */

  const projectTickets = useMemo(() => {
    if (!selectedProject) {
      return [];
    }

    return tickets.filter((ticket) => ticket.project === selectedProject.name);
  }, [tickets, selectedProject]);

  const projectOpenTickets = projectTickets.filter(
    (ticket) =>
      !["Closed", "Resolved", "Cancelled"].includes(String(ticket.status)),
  );

  const projectCritical = projectOpenTickets.filter(
    (ticket) =>
      ticket.priority === 1 ||
      ticket.status === "Critical" ||
      ticket.tags.some((tag) => tag.toLowerCase() === "critical"),
  );

  const projectOverdue = projectOpenTickets.filter((ticket) =>
    isOverdue(ticket.dueDate, now),
  );

  const projectTeam = selectedProject?.teamMembers ?? [];

  const projectResourceRows = useMemo(() => {
    if (!selectedProject) {
      return [];
    }

    return projectTeam
      .map((member) => {
        const resource = resources.find(
          (item) =>
            item.id === member.id ||
            item.name.trim().toLowerCase() === member.name.trim().toLowerCase(),
        );

        const assigned = projectTickets.filter(
          (ticket) =>
            ticket.assignedTo.trim().toLowerCase() ===
            member.name.trim().toLowerCase(),
        ).length;

        const active = projectOpenTickets.filter(
          (ticket) =>
            ticket.assignedTo.trim().toLowerCase() ===
            member.name.trim().toLowerCase(),
        ).length;

        return {
          id: member.id,
          name: member.name,
          role: resource?.jobTitle || member.role || "Resource",
          assigned,
          active,
        };
      });
  }, [
    selectedProject,
    projectTeam,
    resources,
    projectTickets,
    projectOpenTickets,
  ]);

  const priorityTickets = useMemo(
    () => [...projectOpenTickets].sort((left, right) => left.priority - right.priority),
    [projectOpenTickets],
  );

  const nextDue = getNextDueDate(projectOpenTickets, now);

  const recentActivity = useMemo(
    () =>
      [...tickets]
        .sort(
          (left, right) =>
            new Date(right.updatedAt || right.created).getTime() -
            new Date(left.updatedAt || left.created).getTime(),
        ),
    [tickets],
  );

  return (
    <div className="admin-dashboard-page">
      <PageHeader
        title="Admin Dashboard"
        action="Create a New Ticket"
        actionHref="/tickets/new"
        actionIcon={Plus}
      />

      {/* =================================================
          ALERT BOARD
         ================================================= */}

      <section className="admin-dashboard-section">
        <h2 className="admin-dashboard-section-title">Alerts Board</h2>

        <div className="admin-dashboard-metrics">
          <DashboardMetric
            title="Total Projects"
            value={projects.length}
            tone="purple"
          />

          <DashboardMetric
            title="Active Clients"
            value={activeClients}
            tone="blue"
          />

          <DashboardMetric
            title="Team Resources"
            value={resources.length}
            tone="teal"
          />

          <DashboardMetric
            title="Open Tickets"
            value={openTickets.length}
            tone="amber"
          />

          <DashboardMetric
            title="Critical Tickets"
            value={criticalTickets.length}
            tone="red"
          />

          <DashboardMetric
            title="Overdue Tasks"
            value={overdueTickets.length}
            tone="orange"
          />
        </div>
      </section>

      {/* =================================================
          PROJECT HEALTH
         ================================================= */}

      <section className="admin-dashboard-project-section">
        <h2 className="admin-dashboard-section-title">Projects Health</h2>

        <div className="admin-dashboard-project-toolbar">
          <div className="admin-dashboard-project-select">
            <button
              type="button"
              className="admin-dashboard-project-trigger"
              onClick={() => setProjectMenuOpen((current) => !current)}
              disabled={!projects.length}
            >
              <span>{selectedProject?.name ?? "No projects"}</span>

              <ChevronDown
                size={20}
                className={cn(projectMenuOpen && "rotate-180")}
              />
            </button>

            {projectMenuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close project selector"
                  className="fixed inset-0 z-30"
                  onClick={() => setProjectMenuOpen(false)}
                />

                <div className="admin-dashboard-project-menu">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(project.id);

                        setProjectMenuOpen(false);
                      }}
                    >
                      <span>{project.name}</span>

                      {project.id === selectedProject?.id && (
                        <Check size={16} />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <Link href="/projects" className="admin-dashboard-see-more">
            See More
            <ArrowRight size={20} />
          </Link>
        </div>

        <div className="admin-dashboard-health-grid">
          {/* =============================================
              PROJECT HEALTH CARD
             ============================================= */}

          <div className="admin-dashboard-health-card">
            <div className="admin-dashboard-health-box">
              <span>Status</span>

              {selectedProject ? (
                <ProjectStatus
                  status={selectedProject.status}
                  className="!min-w-0"
                />
              ) : (
                <span>—</span>
              )}
            </div>

            <div className="admin-dashboard-health-box">
              <span>Open Tickets</span>

              <strong>{projectOpenTickets.length}</strong>
            </div>

            <div className="admin-dashboard-health-box admin-dashboard-health-summary">
              <strong>{projectOpenTickets.length} Active</strong>

              <strong>{projectCritical.length} Critical</strong>

              <strong>{projectOverdue.length} Overdue</strong>
            </div>

            <div className="admin-dashboard-health-box">
              <span>Next Due</span>

              <strong className="admin-dashboard-date">{nextDue}</strong>
            </div>
          </div>

          {/* =============================================
              RESOURCE WORKLOAD
             ============================================= */}

          <DashboardTableCard
            title="Resource Workload"
            badge={`${projectTeam.length} Resources`}
            scrollable
          >
            <table className="admin-dashboard-mini-table">
              <thead>
                <tr>
                  <th>Name</th>

                  <th>Role</th>

                  <th className="text-center">Assigned</th>

                  <th className="text-center">Active</th>
                </tr>
              </thead>

              <tbody>
                {projectResourceRows.map((resource) => (
                  <tr key={resource.id}>
                    <td>
                      <Link href={`/resources/${resource.id}`}>
                        {resource.name}
                      </Link>
                    </td>

                    <td>{resource.role}</td>

                    <td className="text-center">{resource.assigned}</td>

                    <td className="text-center">{resource.active}</td>
                  </tr>
                ))}

                {!projectResourceRows.length && (
                  <tr>
                    <td colSpan={4} className="admin-dashboard-empty-cell">
                      No resources assigned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </DashboardTableCard>

          {/* =============================================
              TICKETS BY PRIORITY
             ============================================= */}

          <DashboardTableCard
            title="Tickets List ( on the basis of priority )"
            scrollable
          >
            <table className="admin-dashboard-mini-table admin-dashboard-priority-table">
              <thead>
                <tr>
                  <th>Name</th>

                  <th className="text-center">Priority</th>

                  <th className="text-center">Resource</th>
                </tr>
              </thead>

              <tbody>
                {priorityTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <Link href={`/tickets/${ticket.id}`}>{ticket.title}</Link>
                    </td>

                    <td className="text-center">
                      <PriorityBadge
                        priority={
                          priorityMap[ticket.priority] ?? "Not Assigned"
                        }
                      />
                    </td>

                    <td className="text-center">
                      {ticket.assignedTo || "Unassigned"}
                    </td>
                  </tr>
                ))}

                {!priorityTickets.length && (
                  <tr>
                    <td colSpan={3} className="admin-dashboard-empty-cell">
                      No tickets found for this project.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </DashboardTableCard>
        </div>

        {/* ===============================================
            RECENT ACTIVITY
           =============================================== */}

        <DashboardTableCard title="Recent Activity" wide scrollable>
          <table className="admin-dashboard-activity-table">
            <thead>
              <tr>
                <th>Time</th>

                <th>Activity</th>

                <th>Ticket</th>

                <th>User</th>

                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {recentActivity.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{formatActivityTime(ticket.updatedAt || ticket.created, timeZone)}</td>

                  <td>{activityText(ticket)}</td>

                  <td>
                    <Link href={`/tickets/${ticket.id}`}>{ticket.title}</Link>
                  </td>

                  <td>{ticket.assignedTo || ticket.reporter || "Admin"}</td>

                  <td>{ticket.status}</td>
                </tr>
              ))}

              {!recentActivity.length && (
                <tr>
                  <td colSpan={5} className="admin-dashboard-empty-cell">
                    No recent activity.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DashboardTableCard>
      </section>
    </div>
  );
}

/* =========================================================
   METRIC
   ========================================================= */

function DashboardMetric({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "purple" | "blue" | "teal" | "amber" | "red" | "orange";
}) {
  return (
    <article
      className={cn("admin-dashboard-metric", `admin-dashboard-metric-${tone}`)}
    >
      <span>{title}</span>

      <strong>{value}</strong>
    </article>
  );
}

/* =========================================================
   CARD
   ========================================================= */

function DashboardTableCard({
  title,
  badge,
  wide = false,
  scrollable = false,
  children,
}: {
  title: string;
  badge?: string;
  wide?: boolean;
  scrollable?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "admin-dashboard-table-card",
        wide && "admin-dashboard-table-card-wide",
      )}
    >
      <header className="admin-dashboard-card-header">
        <strong>{title}</strong>

        {badge && <span>{badge}</span>}
      </header>

      <div
        className={cn(
          "admin-dashboard-card-content",
          scrollable && "admin-dashboard-card-content-scrollable",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   PRIORITY
   ========================================================= */

function PriorityBadge({ priority }: { priority: PriorityLabel }) {
  return (
    <span
      className={cn(
        "admin-dashboard-priority-badge",

        priority === "Critical" && "admin-dashboard-priority-critical",

        priority === "High" && "admin-dashboard-priority-high",

        priority === "Medium" && "admin-dashboard-priority-medium",

        priority === "Low" && "admin-dashboard-priority-low",

        priority === "Not Assigned" && "admin-dashboard-priority-unassigned",
      )}
    >
      {priority}
    </span>
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function isOverdue(value: string, now: number) {
  if (!value) {
    return false;
  }

  const date = new Date(`${value}T23:59:59`);

  return Number.isFinite(date.getTime()) && date.getTime() < now;
}

function getNextDueDate(tickets: Ticket[], now: number) {
  /*
   * Build today's midnight from the stable server timestamp.
   * This stays deterministic for the entire render.
   */
  const currentDate = new Date(now);

  const todayStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  ).getTime();

  const upcoming = tickets
    .filter((ticket) => {
      if (!ticket.dueDate) {
        return false;
      }

      const dueTime = new Date(`${ticket.dueDate}T00:00:00`).getTime();

      return Number.isFinite(dueTime) && dueTime >= todayStart;
    })
    .sort(
      (left, right) =>
        new Date(`${left.dueDate}T00:00:00`).getTime() -
        new Date(`${right.dueDate}T00:00:00`).getTime(),
    )[0];

  if (!upcoming) {
    return "—";
  }

  const date = new Date(`${upcoming.dueDate}T00:00:00`);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatActivityTime(value: string, timeZoneLabel: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: profileLabelToTimeZone(timeZoneLabel),
  }).format(date);
}

function activityText(ticket: Ticket) {
  if (ticket.status === "Critical") {
    return "Priority changed to Critical";
  }

  if (ticket.status === "Assigned") {
    return "Ticket assigned";
  }

  if (
    ticket.formData?.attachments &&
    Array.isArray(ticket.formData.attachments) &&
    ticket.formData.attachments.length
  ) {
    return "File uploaded";
  }

  return "Comment added";
}
