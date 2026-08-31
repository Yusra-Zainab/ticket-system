"use client";

import Link from "next/link";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import type {
  ResourcePortalDashboardStats,
  ResourcePortalProject,
  ResourcePortalTicket,
} from "@/types/resourcePortal";

const priorityRank: Record<string, number> = {
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4,
  "Not Assigned": 5,
};

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function ResourceDashboardView({
  stats,
  projects,
  tickets,
  canViewProjects = true,
  canViewTickets = true,
}: {
  stats: ResourcePortalDashboardStats;
  projects: ResourcePortalProject[];
  tickets: ResourcePortalTicket[];
  canViewProjects?: boolean;
  canViewTickets?: boolean;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(
    projects[0]?.id ?? "",
  );
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0];

  const projectTickets = useMemo(
    () =>
      selectedProject
        ? tickets.filter((ticket) => ticket.projectId === selectedProject.id)
        : [],
    [selectedProject, tickets],
  );

  const activeProjectTickets = projectTickets.filter(
    (ticket) => !["Closed", "Cancelled", "Resolved"].includes(ticket.status),
  );

  const criticalProjectTickets = activeProjectTickets.filter(
    (ticket) => ticket.priority === "Critical",
  );

  const priorityTickets = [...activeProjectTickets].sort(
    (a, b) =>
      (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99),
  );

  const recentTickets = [...tickets]
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime(),
    )
    .slice(0, 7);

  return (
    <>
      <section className="resource-dashboard-section">
        <h2 className="resource-dashboard-section-title">Alerts Board</h2>
        <div className="resource-dashboard-metrics">
          <Metric
            tone="purple"
            label="Assigned Projects"
            value={stats.assignedProjects}
          />
          <Metric tone="amber" label="Open Tickets" value={stats.openTickets} />
          <Metric
            tone="red"
            label="Assigned to Me"
            value={stats.assignedTickets}
          />
          <Metric tone="orange" label="Ticket Drafts" value={stats.drafts} />
        </div>
      </section>

      {canViewProjects ? (
      <section className="resource-dashboard-project-section">
        <h2 className="resource-dashboard-section-title">Projects Health</h2>

        <div className="resource-dashboard-project-toolbar">
          <div className="resource-dashboard-project-select">
            <button
              type="button"
              className="resource-dashboard-project-trigger"
              disabled={!projects.length}
              onClick={() => setProjectMenuOpen((current) => !current)}
            >
              <span>{selectedProject?.name ?? "No assigned projects"}</span>
              <ChevronDown
                size={20}
                className={
                  projectMenuOpen ? "resource-dashboard-chevron-open" : ""
                }
              />
            </button>

            {projectMenuOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close project menu"
                  className="resource-dashboard-project-menu-backdrop"
                  onClick={() => setProjectMenuOpen(false)}
                />
                <div className="resource-dashboard-project-menu">
                  {projects.map((project) => (
                    <button
                      type="button"
                      key={project.id}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setProjectMenuOpen(false);
                      }}
                    >
                      <span>{project.name}</span>
                      {project.id === selectedProject?.id ? (
                        <Check size={16} />
                      ) : null}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <Link
            href="/resource-portal/projects"
            className="resource-dashboard-see-more"
          >
            See More <ArrowRight size={20} />
          </Link>
        </div>

        {canViewTickets ? (
        <div className="resource-dashboard-health-grid">
          <div className="resource-dashboard-health-card">
            <HealthBox label="Status">
              <StatusBadge status={selectedProject?.status ?? "—"} />
            </HealthBox>
            <HealthBox label="Open Tickets">
              <strong>{activeProjectTickets.length}</strong>
            </HealthBox>
            <div className="resource-dashboard-health-box resource-dashboard-health-summary">
              <strong>{activeProjectTickets.length} Active</strong>
              <strong>{criticalProjectTickets.length} Critical</strong>
              <strong>{selectedProject?.progress ?? 0}% Progress</strong>
            </div>
            <HealthBox label="Next Due">
              <strong className="resource-dashboard-date">
                {formatDate(selectedProject?.dueDate ?? "")}
              </strong>
            </HealthBox>
          </div>

          <DashboardTableCard title="Tickets List ( on the basis of priority )">
            <table className="resource-dashboard-mini-table resource-dashboard-priority-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="resource-center">Priority</th>
                  <th className="resource-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {priorityTickets.slice(0, 5).map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <Link href={`/resource-portal/tickets/${ticket.id}`}>
                        {ticket.title}
                      </Link>
                    </td>
                    <td className="resource-center">
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="resource-center">{ticket.status}</td>
                  </tr>
                ))}
                {!priorityTickets.length ? (
                  <tr>
                    <td colSpan={3} className="resource-dashboard-empty-cell">
                      No open tickets for this project.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </DashboardTableCard>
        </div>

        ) : null}

        {canViewTickets ? (
        <DashboardTableCard title="Recent Activity" wide>
          <table className="resource-dashboard-activity-table">
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
              {recentTickets.map((ticket) => (
                <tr key={ticket.id}>
                  {/* Time */}
                  <td>{formatDate(ticket.updatedAt)}</td>

                  {/* Activity */}
                  <td>Ticket updated</td>

                  {/* Ticket */}
                  <td>
                    <Link href={`/resource-portal/tickets/${ticket.id}`}>
                      {ticket.title}
                    </Link>
                  </td>

                  {/* User */}
                  <td>{ticket.assignee || "Unassigned"}</td>

                  {/* Status */}
                  <td>{ticket.status}</td>
                </tr>
              ))}

              {!recentTickets.length ? (
                <tr>
                  <td colSpan={5} className="resource-dashboard-empty-cell">
                    No recent ticket activity.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </DashboardTableCard>
        ) : null}
      </section>
      ) : null}
    </>
  );
}

function Metric({
  tone,
  label,
  value,
}: {
  tone: "purple" | "amber" | "red" | "orange";
  label: string;
  value: number;
}) {
  return (
    <article
      className={`resource-dashboard-metric resource-dashboard-metric-${tone}`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function DashboardTableCard({
  title,
  badge,
  wide = false,
  children,
}: {
  title: string;
  badge?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        wide
          ? "resource-dashboard-table-card resource-dashboard-table-card-wide"
          : "resource-dashboard-table-card"
      }
    >
      <div className="resource-dashboard-card-header">
        <strong>{title}</strong>
        {badge ? <span>{badge}</span> : null}
      </div>
      <div className="resource-dashboard-card-content">{children}</div>
    </div>
  );
}

function HealthBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="resource-dashboard-health-box">
      <span>{label}</span>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const value = status.toLowerCase();
  return (
    <span
      className={`resource-status-badge ${
        value.includes("critical") || value.includes("risk")
          ? "resource-status-danger"
          : value.includes("complete")
            ? "resource-status-success"
            : "resource-status-info"
      }`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`resource-priority-badge resource-priority-${priority.toLowerCase().replaceAll(" ", "-")}`}
    >
      {priority}
    </span>
  );
}
