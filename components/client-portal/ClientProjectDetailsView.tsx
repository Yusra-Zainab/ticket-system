"use client";

import Link from "next/link";
import {
  ChevronRight,
  FileText,
  Plus,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import ProjectStatus from "@/components/features/ProjectStatus";
import { usePageSearch } from "@/components/providers/PageSearchProvider";
import { Avatar } from "@/components/ui/Avatar";
import { cn, sanitizeRichText } from "@/lib/utils";
import type {
  ClientPortalProject,
  ClientPortalTicket,
} from "@/types/clientPortal";

const tabs = [
  "Overview",
  "Tickets",
  "Modules",
  "Team",
  "Files",
  "Timeline",
  "Reports",
  "Settings",
] as const;

type ProjectTab = (typeof tabs)[number];

type ProjectLink = {
  title: string;
  href: string;
};

function formatDate(value: string) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatProjectDate(value: string) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

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

export default function ClientProjectDetailsView({
  project,
  tickets,
}: {
  project: ClientPortalProject;
  tickets: ClientPortalTicket[];
}) {
  const { query } = usePageSearch();
  const [activeTab, setActiveTab] = useState<ProjectTab>("Overview");

  const projectTickets = useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          ticket.projectId === project.id || ticket.project === project.name,
      ),
    [project.id, project.name, tickets],
  );

  const links = useMemo<ProjectLink[]>(
    () =>
      [
        { title: "Staging", href: project.links.staging ?? "" },
        { title: "Live", href: project.links.live ?? "" },
        { title: "Figma", href: project.links.figma ?? "" },
        { title: "GitHub", href: project.links.github ?? "" },
      ].filter((link) => link.href.trim().length > 0),
    [project.links],
  );

  const modules = useMemo(
    () =>
      Array.from(
        new Set(
          [project.moduleName, project.subModule]
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ),
    [project.moduleName, project.subModule],
  );

  const search = query.trim().toLowerCase();

  const filteredTickets = search
    ? projectTickets.filter((ticket) =>
        [
          ticket.title,
          ticket.status,
          ticket.priority,
          ticket.assignee,
          ticket.reporter,
          ticket.type,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search),
      )
    : projectTickets;

  const filteredTeam = search
    ? project.team.filter((member) =>
        `${member.name} ${member.role}`.toLowerCase().includes(search),
      )
    : project.team;

  const filteredFiles = search
    ? project.files.filter((file) =>
        `${file.name} ${file.mimeType}`.toLowerCase().includes(search),
      )
    : project.files;

  const filteredLinks = search
    ? links.filter((link) =>
        `${link.title} ${link.href}`.toLowerCase().includes(search),
      )
    : links;

  const filteredModules = search
    ? modules.filter((module) => module.toLowerCase().includes(search))
    : modules;

  const latestUpdates = projectTickets.slice(0, 5);

  return (
    <div className="client-project-detail-page">
      <style>{`
        .client-project-detail-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding-bottom: 112px;
        }

        .client-project-detail-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin: -12px -12px 0;
          padding: 12px;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(8px);
        }

        .client-project-detail-title {
          margin: 0;
          color: #101828;
          font-family: Satoshi, Inter, Arial, sans-serif;
          font-size: 30px;
          font-weight: 700;
          line-height: 38px;
          letter-spacing: -0.02em;
        }

        .client-project-detail-client {
          margin: 4px 0 0;
          color: #475467;
          font-family: Geist, Inter, Arial, sans-serif;
          font-size: 16px;
          font-weight: 400;
          line-height: 24px;
        }

        .client-project-detail-client strong {
          color: #344054;
          font-weight: 600;
        }

        .client-project-create-ticket {
          display: inline-flex;
          width: 122px;
          min-height: 40px;
          flex: none;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 0;
          border-radius: 8px;
          background: linear-gradient(
            66.43deg,
            #0284c7 12.82%,
            #06b6d4 47.68%,
            #22d3ee 82.54%
          );
          padding: 10px 14px;
          color: #fff;
          font-family: Geist, Inter, Arial, sans-serif;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
          text-decoration: none;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
        }

        .client-project-create-ticket:hover {
          filter: brightness(0.98);
        }

        .client-project-metrics-shell {
          width: 100%;
          border-radius: 8px;
          background: #06b6d4;
          padding: 8px;
        }

        .client-project-metrics {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
        }

        .client-project-metric {
          min-width: 0;
          min-height: 98px;
          border-radius: 12px;
          background: #f8fafc;
          padding: 16px 12px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
        }

        .client-project-metric-label {
          overflow: hidden;
          margin: 0;
          color: #475467;
          font-family: Geist, Inter, Arial, sans-serif;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .client-project-metric-value {
          overflow: hidden;
          margin: 10px 0 0;
          color: #101828;
          font-family: Satoshi, Inter, Arial, sans-serif;
          font-size: 30px;
          font-weight: 700;
          line-height: 38px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .client-project-status-priority {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .client-project-metric-pill-row {
          display: flex;
          min-width: 0;
          align-items: center;
          margin-top: 10px;
        }

        .client-project-priority {
          display: inline-flex;
          min-height: 28px;
          max-width: 112px;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px solid;
          border-radius: 16px;
          padding: 4px 12px;
          font-family: Inter, Arial, sans-serif;
          font-size: 12px;
          font-weight: 500;
          line-height: 18px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .client-project-tabs {
          display: flex;
          width: 100%;
          gap: 12px;
          overflow-x: auto;
          border-bottom: 1px solid #eaecf0;
        }

        .client-project-tab {
          flex: none;
          min-height: 36px;
          border: 0;
          border-bottom: 2px solid transparent;
          background: transparent;
          padding: 0 10px 12px;
          color: #667085;
          font-family: Geist, Inter, Arial, sans-serif;
          font-size: 16px;
          font-weight: 600;
          line-height: 24px;
          cursor: pointer;
        }

        .client-project-tab:hover {
          color: #344054;
        }

        .client-project-tab-active {
          border-bottom-color: #06b6d4;
          color: #0284c7;
        }

        .client-project-overview {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .client-project-field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .client-project-field-label {
          margin: 0;
          color: #344054;
          font-family: Inter, Arial, sans-serif;
          font-size: 14px;
          font-weight: 500;
          line-height: 20px;
        }

        .client-project-field-value {
          margin-top: 8px;
          color: #667085;
          font-family: Geist, Inter, Arial, sans-serif;
          font-size: 16px;
          font-weight: 400;
          line-height: 24px;
        }

        .client-project-field-value p {
          margin: 0 0 12px;
        }

        .client-project-field-value p:last-child {
          margin-bottom: 0;
        }

        .client-project-link-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 16px;
        }

        .client-project-link-list a {
          color: #0284c7;
          font-weight: 600;
          text-underline-offset: 4px;
        }

        .client-project-updates {
          overflow: hidden;
          border: 1px solid #eaecf0;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
        }

        .client-project-updates-heading {
          border-bottom: 1px solid #eaecf0;
          padding: 16px 24px;
        }

        .client-project-updates-heading h2,
        .client-project-panel h2,
        .client-project-empty h2 {
          margin: 0;
          color: #101828;
          font-family: Geist, Inter, Arial, sans-serif;
          font-size: 16px;
          font-weight: 600;
          line-height: 24px;
        }

        .client-project-updates-table-wrap {
          overflow-x: auto;
        }

        .client-project-updates table {
          width: 100%;
          min-width: 720px;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .client-project-updates th {
          height: 42px;
          border-bottom: 1px solid #eaecf0;
          background: #f9fafb;
          padding: 12px 24px;
          color: #475467;
          font-family: Geist, Inter, Arial, sans-serif;
          font-size: 12px;
          font-weight: 600;
          line-height: 18px;
          text-align: left;
        }

        .client-project-updates th:nth-child(2),
        .client-project-updates th:nth-child(3),
        .client-project-updates td:nth-child(2),
        .client-project-updates td:nth-child(3) {
          text-align: center;
        }

        .client-project-updates td {
          height: 52px;
          border-bottom: 1px solid #eaecf0;
          padding: 16px 24px;
          color: #475467;
          font-family: Geist, Inter, Arial, sans-serif;
          font-size: 14px;
          line-height: 20px;
        }

        .client-project-updates tbody tr:nth-child(even) {
          background: #f2f4f7;
        }

        .client-project-updates tbody tr:last-child td {
          border-bottom: 0;
        }

        .client-project-panel {
          border: 1px solid #eaecf0;
          border-radius: 12px;
          background: #fff;
          padding: 20px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
        }

        .client-project-panel > p,
        .client-project-empty > p {
          margin: 4px 0 0;
          color: #667085;
          font-size: 14px;
          line-height: 20px;
        }

        .client-project-record-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 20px;
        }

        .client-project-record {
          display: flex;
          min-height: 64px;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border: 1px solid #eaecf0;
          border-radius: 12px;
          background: #fff;
          padding: 12px 16px;
          color: inherit;
          text-decoration: none;
        }

        .client-project-record:hover {
          background: #f9fafb;
        }

        .client-project-record-static:hover {
          background: #fff;
        }

        .client-project-record-copy {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 12px;
        }

        .client-project-record-copy > div {
          min-width: 0;
        }

        .client-project-record-title {
          overflow: hidden;
          margin: 0;
          color: #101828;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .client-project-record-meta {
          overflow: hidden;
          margin: 3px 0 0;
          color: #667085;
          font-size: 13px;
          line-height: 18px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .client-project-record-list-empty {
          padding: 32px 10px;
          color: #98a2b3;
          font-size: 14px;
          text-align: center;
        }

        .client-project-empty {
          border: 1px solid #eaecf0;
          border-radius: 12px;
          background: #fff;
          padding: 32px;
          text-align: center;
        }

        .client-project-empty svg {
          margin: 0 auto;
          color: #98a2b3;
        }

        .client-project-empty h2 {
          margin-top: 12px;
        }

        .client-project-readonly-note {
          display: inline-flex;
          margin-top: 16px;
          border: 1px solid #b2e8f2;
          border-radius: 16px;
          background: #e6f8fb;
          padding: 4px 10px;
          color: #0284c7;
          font-size: 12px;
          font-weight: 600;
        }

        @media (max-width: 1050px) {
          .client-project-metrics {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .client-project-detail-header {
            position: static;
            align-items: stretch;
            flex-direction: column;
          }

          .client-project-create-ticket {
            width: fit-content;
          }

          .client-project-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .client-project-field-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 520px) {
          .client-project-metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="client-project-detail-header">
        <div>
          <h1 className="client-project-detail-title">{project.name}</h1>
          <p className="client-project-detail-client">
            <strong>Client:</strong> {project.company || "Not set"}
          </p>
        </div>

        <Link
          href={`/client-portal/tickets/new?projectId=${encodeURIComponent(
            project.id,
          )}&project=${encodeURIComponent(project.name)}`}
          className="client-project-create-ticket"
        >
          <Plus size={18} />
          New Ticket
        </Link>
      </header>

      <section className="client-project-metrics-shell">
        <div className="client-project-metrics">
          <article className="client-project-metric">
            <div className="client-project-status-priority">
              <MetricGroup label="Status">
                <ProjectStatus
                  status={project.status}
                  subtle
                  size="sm"
                  className="!h-[28px] !min-w-0 !max-w-[112px] !px-2.5 !text-[12px]"
                />
              </MetricGroup>

              <MetricGroup label="Priority">
                <PriorityBadge priority={project.priority} />
              </MetricGroup>
            </div>
          </article>

          <MetricCard label="Open Tickets" value={String(project.openTickets)} />
          <MetricCard label="Team Members" value={String(project.team.length)} />
          <MetricCard label="Progress %" value={`${project.progress ?? 0}%`} />
          <MetricCard
            label="Last Updated"
            value={formatProjectDate(project.updatedAt)}
          />
        </div>
      </section>

      <nav className="client-project-tabs" aria-label="Project details">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "client-project-tab",
              activeTab === tab && "client-project-tab-active",
            )}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === "Overview" && (
        <div className="client-project-overview">
          <DetailSection title="Project Brief">
            {project.description?.trim() ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichText(project.description),
                }}
              />
            ) : (
              <p>No project brief has been added.</p>
            )}
          </DetailSection>

          <div className="client-project-field-grid">
            <DetailSection title="Project Type">
              <p>{project.projectType || "No project type saved."}</p>
            </DetailSection>

            <DetailSection title="Department">
              <p>{project.department || "No department saved."}</p>
            </DetailSection>
          </div>

          <div className="client-project-field-grid">
            <DetailSection title="Module">
              <p>{project.moduleName || "No module saved."}</p>
            </DetailSection>

            <DetailSection title="Sub Module">
              <p>{project.subModule || "No sub module saved."}</p>
            </DetailSection>
          </div>

          <DetailSection title="Project Links">
            {filteredLinks.length ? (
              <div className="client-project-link-list">
                {filteredLinks.map((link) => (
                  <a
                    key={link.title}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.title}
                  </a>
                ))}
              </div>
            ) : (
              <p>No project links saved.</p>
            )}
          </DetailSection>

          <section className="client-project-updates">
            <div className="client-project-updates-heading">
              <h2>Latest Updates</h2>
            </div>

            <div className="client-project-updates-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Update</th>
                    <th>User</th>
                  </tr>
                </thead>

                <tbody>
                  {latestUpdates.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>{formatDate(ticket.updatedAt || ticket.createdAt)}</td>
                      <td>
                        <Link
                          href={`/client-portal/tickets/${ticket.id}`}
                          className="font-medium text-[#344054] hover:text-[#0284C7]"
                        >
                          {ticket.title}
                        </Link>
                      </td>
                      <td>{ticket.assignee || ticket.reporter || "—"}</td>
                    </tr>
                  ))}

                  {!latestUpdates.length && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center", color: "#98a2b3" }}>
                        No updates are available for this project yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === "Tickets" && (
        <RecordsPanel
          title="Tickets"
          description="Tickets linked to this project."
          items={filteredTickets.map((ticket) => ({
            id: ticket.id,
            title: ticket.title,
            href: `/client-portal/tickets/${ticket.id}`,
            meta: `${ticket.status} · ${ticket.priority} · ${
              ticket.assignee || "Unassigned"
            }`,
          }))}
        />
      )}

      {activeTab === "Modules" && (
        <RecordsPanel
          title="Modules"
          description="Modules stored on this project."
          items={filteredModules.map((module, index) => ({
            id: `${index}-${module}`,
            title: module,
            meta: "Saved on this project",
          }))}
          staticRows
        />
      )}

      {activeTab === "Team" && (
        <RecordsPanel
          title="Team"
          description="Team members assigned to this project."
          items={filteredTeam.map((member) => ({
            id: member.id,
            title: member.name,
            meta: member.role,
          }))}
          avatar
          staticRows
        />
      )}

      {activeTab === "Files" && (
        <RecordsPanel
          title="Files"
          description="Files shared on this project."
          items={filteredFiles.map((file) => ({
            id: file.id,
            title: file.name,
            href: file.url,
            meta: `${formatFileSize(file.size)} · ${formatDate(file.uploadedAt)}`,
          }))}
          external
          footer={
            filteredLinks.length ? (
              <div style={{ marginTop: 20, borderTop: "1px solid #eaecf0", paddingTop: 20 }}>
                <h3 className="client-project-field-label">Saved Links</h3>
                <div className="client-project-link-list" style={{ marginTop: 10 }}>
                  {filteredLinks.map((link) => (
                    <a
                      key={link.title}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
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
          description="Timeline generated from activity on project tickets."
          items={projectTickets.map((ticket) => ({
            id: ticket.id,
            title: ticket.title,
            href: `/client-portal/tickets/${ticket.id}`,
            meta: `${formatDate(ticket.updatedAt || ticket.createdAt)} · ${
              ticket.assignee || ticket.reporter || "—"
            }`,
          }))}
        />
      )}

      {activeTab === "Reports" && (
        <EmptyState
          title="Reports"
          description="Project reporting is not available in the client portal yet."
        />
      )}

      {activeTab === "Settings" && (
        <EmptyState
          title="Settings"
          description="Project settings are managed by your delivery team."
          note="Client access is read-only."
        />
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="client-project-metric">
      <p className="client-project-metric-label">{label}</p>
      <p className="client-project-metric-value" title={value}>
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
  children: ReactNode;
}) {
  return (
    <div style={{ minWidth: 0, overflow: "hidden" }}>
      <p className="client-project-metric-label">{label}</p>
      <div className="client-project-metric-pill-row">{children}</div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const normalized = priority || "Not Assigned";

  const styles: Record<string, { border: string; background: string; color: string }> = {
    Critical: {
      border: "#fecdca",
      background: "#fef3f2",
      color: "#b42318",
    },
    High: {
      border: "#fedf89",
      background: "#fffaeb",
      color: "#b54708",
    },
    Medium: {
      border: "#b2ddff",
      background: "#eff8ff",
      color: "#175cd3",
    },
    Low: {
      border: "#abefc6",
      background: "#ecfdf3",
      color: "#067647",
    },
    "Not Assigned": {
      border: "#d0d5dd",
      background: "#f9fafb",
      color: "#475467",
    },
  };

  const palette = styles[normalized] ?? styles["Not Assigned"];

  return (
    <span
      className="client-project-priority"
      style={{
        borderColor: palette.border,
        background: palette.background,
        color: palette.color,
      }}
    >
      {normalized}
    </span>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="client-project-field-label">{title}</h2>
      <div className="client-project-field-value">{children}</div>
    </section>
  );
}

function RecordsPanel({
  title,
  description,
  items,
  avatar = false,
  external = false,
  staticRows = false,
  footer,
}: {
  title: string;
  description: string;
  items: Array<{
    id: string;
    title: string;
    href?: string;
    meta?: string;
  }>;
  avatar?: boolean;
  external?: boolean;
  staticRows?: boolean;
  footer?: ReactNode;
}) {
  return (
    <section className="client-project-panel">
      <h2>{title}</h2>
      <p>{description}</p>

      <div className="client-project-record-list">
        {items.length ? (
          items.map((item) => {
            const content = (
              <>
                <div className="client-project-record-copy">
                  {avatar ? <Avatar name={item.title} className="!size-10" /> : null}

                  <div>
                    <p className="client-project-record-title">{item.title}</p>
                    {item.meta ? (
                      <p className="client-project-record-meta">{item.meta}</p>
                    ) : null}
                  </div>
                </div>

                {!staticRows && <ChevronRight size={16} color="#98a2b3" />}
              </>
            );

            if (external && item.href) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="client-project-record"
                >
                  {content}
                </a>
              );
            }

            if (!staticRows && item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="client-project-record"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={item.id}
                className="client-project-record client-project-record-static"
              >
                {content}
              </div>
            );
          })
        ) : (
          <div className="client-project-record-list-empty">
            No records to show.
          </div>
        )}
      </div>

      {footer}
    </section>
  );
}

function EmptyState({
  title,
  description,
  note,
}: {
  title: string;
  description: string;
  note?: string;
}) {
  return (
    <section className="client-project-empty">
      <FileText size={24} />
      <h2>{title}</h2>
      <p>{description}</p>
      {note ? <span className="client-project-readonly-note">{note}</span> : null}
    </section>
  );
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}