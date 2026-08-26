"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";

import PageHeader from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

type DashboardStats = {
  activeProjects: number;
  openTickets: number;
  drafts: number;
  teamMembers: number;
};

type DashboardProject = {
  id: string;
  name: string;
  status: string;
  progress: number;
  openTickets: number;
};

type DashboardTicket = {
  id: string;
  title: string;
  status: string;
  project: string;
};

export default function ClientDashboardView({
  stats,
  projects,
  tickets,
}: {
  stats: DashboardStats;
  projects: DashboardProject[];
  tickets: DashboardTicket[];
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(
    projects[0]?.id ?? "",
  );
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ??
    projects[0];

  const projectTickets = useMemo(() => {
    if (!selectedProject) {
      return [];
    }

    return tickets.filter(
      (ticket) => ticket.project === selectedProject.name,
    );
  }, [selectedProject, tickets]);

  const visibleTickets = (
    projectTickets.length ? projectTickets : tickets
  ).slice(0, 4);

  return (
    <div className="client-dashboard-page admin-dashboard-page">
      {/*
        The shared Admin PageHeader is used intentionally so the Client
        dashboard header is styled identically to Admin.
      */}
      <PageHeader
        title="Client Dashboard"
        action="Create a New Ticket"
        actionHref="/client-portal/tickets/new"
        actionIcon={Plus}
      />

      <section className="admin-dashboard-section">
        <h2 className="admin-dashboard-section-title">Alerts Board</h2>

        <div className="admin-dashboard-metrics client-dashboard-metrics">
          <DashboardMetric
            title="Total Projects"
            value={projects.length}
            tone="purple"
          />

          <DashboardMetric
            title="Active Projects"
            value={stats.activeProjects}
            tone="teal"
          />

          <DashboardMetric
            title="Open Tickets"
            value={stats.openTickets}
            tone="amber"
          />

          <DashboardMetric
            title="Ticket Drafts"
            value={stats.drafts}
            tone="red"
          />

          <DashboardMetric
            title="Team Members"
            value={stats.teamMembers}
            tone="orange"
          />
        </div>
      </section>

      <section className="admin-dashboard-project-section">
        <h2 className="admin-dashboard-section-title">Projects Overview</h2>

        <div className="admin-dashboard-project-toolbar">
          <div className="admin-dashboard-project-select">
            <button
              type="button"
              className="admin-dashboard-project-trigger"
              onClick={() =>
                setProjectMenuOpen((current) => !current)
              }
              disabled={!projects.length}
            >
              <span>{selectedProject?.name ?? "No projects"}</span>

              <ChevronDown
                size={20}
                className={cn(
                  "transition-transform",
                  projectMenuOpen && "rotate-180",
                )}
              />
            </button>

            {projectMenuOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close project selector"
                  className="fixed inset-0 z-30 cursor-default"
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
            href="/client-portal/projects"
            className="admin-dashboard-see-more"
          >
            See More
            <ArrowRight size={20} />
          </Link>
        </div>

        <div className="admin-dashboard-health-grid client-dashboard-health-grid">
          <div className="admin-dashboard-health-card">
            <div className="admin-dashboard-health-box">
              <span>Status</span>

              <ProjectStatusPill
                status={selectedProject?.status ?? "—"}
              />
            </div>

            <div className="admin-dashboard-health-box">
              <span>Progress</span>
              <strong>{selectedProject?.progress ?? 0}%</strong>
            </div>

            <div className="admin-dashboard-health-box admin-dashboard-health-summary">
              <strong>
                {selectedProject?.openTickets ?? 0} Open
              </strong>
              <strong>{stats.drafts} Drafts</strong>
              <strong>{stats.teamMembers} Team</strong>
            </div>

            <div className="admin-dashboard-health-box">
              <span>Project ID</span>
              <strong className="client-dashboard-project-id">
                {selectedProject?.id ?? "—"}
              </strong>
            </div>
          </div>

          <DashboardTableCard title="Recent Tickets">
            <table className="admin-dashboard-mini-table client-dashboard-ticket-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Status</th>
                  <th>Project</th>
                </tr>
              </thead>

              <tbody>
                {visibleTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <Link
                        href={`/client-portal/tickets/${ticket.id}`}
                      >
                        {ticket.title}
                      </Link>
                    </td>

                    <td>
                      <TicketStatusPill status={ticket.status} />
                    </td>

                    <td>{ticket.project || "—"}</td>
                  </tr>
                ))}

                {!visibleTickets.length ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="admin-dashboard-empty-cell"
                    >
                      No tickets yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </DashboardTableCard>
        </div>

        <DashboardTableCard
          title="Recent Projects"
          wide
          className="client-dashboard-recent-projects"
        >
          <table className="admin-dashboard-activity-table client-dashboard-project-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Open Tickets</th>
                <th>View</th>
              </tr>
            </thead>

            <tbody>
              {projects.slice(0, 3).map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>

                  <td>
                    <ProjectStatusPill status={project.status} />
                  </td>

                  <td>{project.progress}%</td>

                  <td>{project.openTickets}</td>

                  <td>
                    <Link
                      href={`/client-portal/projects/${project.id}`}
                    >
                      View Project
                    </Link>
                  </td>
                </tr>
              ))}

              {!projects.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="admin-dashboard-empty-cell"
                  >
                    No company projects yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </DashboardTableCard>
      </section>

      <style>{`
        /*
         * The attached Client Dashboard design uses five 268.8px metric
         * cards across a 1376px content width. Admin's dashboard uses the
         * same visual component, but six columns; this scoped override is
         * the only layout difference required for Client data.
         */
        .client-dashboard-page .client-dashboard-metrics {
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
        }

        /*
         * Attached Client CSS: 250px cyan project-health card + one
         * remaining 1110px table.
         */
        .client-dashboard-page .client-dashboard-health-grid {
          grid-template-columns: 250px minmax(0, 1fr);
          gap: 16px;
        }

        .client-dashboard-page .admin-dashboard-table-card {
          height: 224px;
        }

        .client-dashboard-page .client-dashboard-recent-projects {
          width: 100%;
          height: 196px;
        }

        .client-dashboard-project-id {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 16px !important;
          line-height: 22px !important;
        }

        .client-dashboard-status-pill {
          display: inline-flex;
          width: fit-content;
          min-width: 0;
          align-items: center;
          justify-content: center;
          border: 1px solid #b9e6fe;
          border-radius: 16px;
          background: #f0f9ff;
          padding: 2px 8px;
          color: #026aa2;
          font-family: Inter, sans-serif;
          font-size: 12px;
          font-weight: 500;
          line-height: 18px;
          white-space: nowrap;
        }

        .client-dashboard-status-pill.is-success {
          border-color: #abefc6;
          background: #ecfdf3;
          color: #067647;
        }

        .client-dashboard-status-pill.is-warning {
          border-color: #fedf89;
          background: #fffaeb;
          color: #b54708;
        }

        .client-dashboard-status-pill.is-danger {
          border-color: #fecdca;
          background: #fef3f2;
          color: #b42318;
        }

        .client-dashboard-status-pill.is-neutral {
          border-color: #d0d5dd;
          background: #f2f4f7;
          color: #475467;
        }

        .client-dashboard-ticket-table th:first-child {
          width: 48%;
        }

        .client-dashboard-ticket-table th:nth-child(2) {
          width: 20%;
        }

        .client-dashboard-ticket-table th:nth-child(3) {
          width: 32%;
        }

        .client-dashboard-project-table th {
          width: 20%;
        }

        @media (max-width: 1280px) {
          .client-dashboard-page .client-dashboard-metrics {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .client-dashboard-page .client-dashboard-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .client-dashboard-page .client-dashboard-health-grid {
            grid-template-columns: 1fr;
          }

          .client-dashboard-page .admin-dashboard-health-card {
            width: 250px;
          }
        }

        @media (max-width: 600px) {
          .client-dashboard-page .client-dashboard-metrics {
            grid-template-columns: 1fr;
          }

          .client-dashboard-page .admin-dashboard-health-card {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

function DashboardMetric({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "purple" | "teal" | "amber" | "red" | "orange";
}) {
  return (
    <article
      className={cn(
        "admin-dashboard-metric",
        `admin-dashboard-metric-${tone}`,
      )}
    >
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

function DashboardTableCard({
  title,
  wide = false,
  className,
  children,
}: {
  title: string;
  wide?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "admin-dashboard-table-card",
        wide && "admin-dashboard-table-card-wide",
        className,
      )}
    >
      <header className="admin-dashboard-card-header">
        <strong>{title}</strong>
      </header>

      <div className="admin-dashboard-card-content">
        {children}
      </div>
    </section>
  );
}

function statusTone(status: string) {
  const value = status.trim().toLowerCase();

  if (
    value.includes("active") ||
    value.includes("complete") ||
    value.includes("resolved") ||
    value.includes("closed")
  ) {
    return "is-success";
  }

  if (
    value.includes("hold") ||
    value.includes("await") ||
    value.includes("review") ||
    value.includes("progress")
  ) {
    return "is-warning";
  }

  if (
    value.includes("critical") ||
    value.includes("blocked") ||
    value.includes("cancel") ||
    value.includes("overdue")
  ) {
    return "is-danger";
  }

  if (
    value.includes("not started") ||
    value.includes("draft") ||
    value.includes("unassigned")
  ) {
    return "is-neutral";
  }

  return "";
}

function ProjectStatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "client-dashboard-status-pill",
        statusTone(status),
      )}
    >
      {status}
    </span>
  );
}

function TicketStatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "client-dashboard-status-pill",
        statusTone(status),
      )}
    >
      {status}
    </span>
  );
}