"use client";

import Link from "next/link";
import {
  ChevronRight,
  ExternalLink,
  FileText,
  FolderOpen,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";

import { usePageSearch } from "@/components/providers/PageSearchProvider";
import type {
  ResourcePortalProject,
  ResourcePortalTicket,
} from "@/types/resourcePortal";

type Tab = "Overview" | "Tickets" | "Modules" | "Team" | "Files" | "Timeline";

const tabs: Tab[] = [
  "Overview",
  "Tickets",
  "Modules",
  "Team",
  "Files",
  "Timeline",
];

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
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

export default function ResourceProjectDetails({
  project,
  tickets,
}: {
  project: ResourcePortalProject;
  tickets: ResourcePortalTicket[];
}) {
  const { query } = usePageSearch();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  const projectTickets = useMemo(
    () =>
      tickets
        .filter((ticket) => ticket.projectId === project.id)
        .sort(
          (left, right) =>
            new Date(right.updatedAt || right.createdAt).getTime() -
            new Date(left.updatedAt || left.createdAt).getTime(),
        ),
    [project.id, tickets],
  );

  const modules = useMemo(
    () =>
      Array.from(
        new Set(
          [project.moduleName, project.subModule]
            .map((value) => value?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [project.moduleName, project.subModule],
  );

  const projectLinks = useMemo(
    () =>
      Object.entries(project.links)
        .filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()))
        .map(([key, href]) => ({
          title: key.replace(/^./, (letter) => letter.toUpperCase()),
          href,
        })),
    [project.links],
  );

  const search = query.trim().toLowerCase();

  const filteredTickets = useMemo(
    () =>
      search
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
        : projectTickets,
    [projectTickets, search],
  );

  const filteredModules = useMemo(
    () =>
      search
        ? modules.filter((module) => module.toLowerCase().includes(search))
        : modules,
    [modules, search],
  );

  const filteredTeam = useMemo(
    () =>
      search
        ? project.team.filter((member) =>
            `${member.name} ${member.role}`.toLowerCase().includes(search),
          )
        : project.team,
    [project.team, search],
  );

  const filteredFiles = useMemo(
    () =>
      search
        ? project.files.filter((file) =>
            `${file.name} ${file.mimeType}`.toLowerCase().includes(search),
          )
        : project.files,
    [project.files, search],
  );

  const filteredLinks = useMemo(
    () =>
      search
        ? projectLinks.filter((link) =>
            `${link.title} ${link.href}`.toLowerCase().includes(search),
          )
        : projectLinks,
    [projectLinks, search],
  );

  const latestUpdates = filteredTickets.slice(0, 5);

  return (
    <>
      <div className="resource-admin-project-details">
        <section className="resource-admin-project-metrics">
          <article className="resource-admin-project-metric-card resource-admin-project-metric-split">
            <MetricGroup label="Status">
              <ProjectStatus status={project.status} />
            </MetricGroup>

            <MetricGroup label="Priority">
              <PriorityBadge priority={project.priority} />
            </MetricGroup>
          </article>

          <MetricCard label="Open Tickets" value={String(project.openTickets)} />
          <MetricCard label="Team Members" value={String(project.team.length)} />
          <MetricCard label="Progress %" value={`${project.progress ?? 0}%`} />
          <MetricCard
            label="Last Updated"
            value={formatProjectDate(project.updatedAt)}
          />
        </section>

        <nav className="resource-admin-project-tabs" aria-label="Project detail tabs">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab}
              className={
                activeTab === tab
                  ? "resource-admin-project-tab resource-admin-project-tab-active"
                  : "resource-admin-project-tab"
              }
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="resource-admin-project-tab-content">
          {activeTab === "Overview" ? (
            <div className="resource-admin-project-overview">
              <Section
                title="Project Brief"
                prominent
                body={
                  project.description?.trim()
                    ? project.description
                    : "Project brief is not stored in the current project record."
                }
              />

              <div className="resource-admin-project-field-grid">
                <Section
                  title="Client"
                  body={project.client || "No client saved."}
                />

                <Section
                  title="Due Date"
                  body={project.dueDate ? formatDate(project.dueDate) : "Not set"}
                />
              </div>

              <div className="resource-admin-project-field-grid">
                <Section
                  title="Module"
                  body={project.moduleName || "No module saved."}
                />

                <Section
                  title="Sub Module"
                  body={project.subModule || "No sub module saved."}
                />
              </div>

              <Section
                title="Project Links"
                body={
                  filteredLinks.length ? (
                    <div className="resource-admin-project-links">
                      {filteredLinks.map((link) => (
                        <a
                          key={link.title}
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {link.title}
                          <ExternalLink size={15} />
                        </a>
                      ))}
                    </div>
                  ) : (
                    "No project links saved."
                  )
                }
              />

              <section className="resource-admin-latest-updates">
                <div className="resource-admin-latest-updates-header">
                  <h2>Latest Updates</h2>
                </div>

                <div className="resource-admin-project-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th className="resource-admin-center">Update</th>
                        <th className="resource-admin-center">Resource</th>
                      </tr>
                    </thead>

                    <tbody>
                      {latestUpdates.map((ticket, index) => (
                        <tr
                          key={ticket.id}
                          className={
                            index % 2 === 1
                              ? "resource-admin-detail-row-alt"
                              : ""
                          }
                        >
                          <td>{formatDate(ticket.updatedAt || ticket.createdAt)}</td>
                          <td className="resource-admin-center">
                            <Link href={`/resource-portal/tickets/${ticket.id}`}>
                              {ticket.title}
                            </Link>
                          </td>
                          <td className="resource-admin-center">
                            {ticket.assignee || ticket.reporter || "—"}
                          </td>
                        </tr>
                      ))}

                      {!latestUpdates.length ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="resource-admin-detail-empty-cell"
                          >
                            No matching updates.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "Tickets" ? (
            <RecordsPanel
              title="Tickets"
              description="Project tickets assigned within this project."
              icon={<FileText size={19} />}
              items={filteredTickets.map((ticket) => ({
                id: ticket.id,
                title: ticket.title,
                href: `/resource-portal/tickets/${ticket.id}`,
                meta: `${ticket.status} · ${ticket.priority} · ${
                  ticket.assignee || "Unassigned"
                }`,
              }))}
            />
          ) : null}

          {activeTab === "Modules" ? (
            <RecordsPanel
              title="Modules"
              description="Modules assigned to this project."
              icon={<FolderOpen size={19} />}
              items={filteredModules.map((module, index) => ({
                id: `${module}-${index}`,
                title: module,
                meta: "Project module",
              }))}
            />
          ) : null}

          {activeTab === "Team" ? (
            <RecordsPanel
              title="Team"
              description="Resources assigned to this project."
              avatar
              items={filteredTeam.map((member) => ({
                id: member.id,
                title: member.name,
                meta: member.role,
                avatar: member.avatar ?? undefined,
              }))}
            />
          ) : null}

          {activeTab === "Files" ? (
            <RecordsPanel
              title="Files"
              description="Files attached to this project."
              icon={<FileText size={19} />}
              external
              items={filteredFiles.map((file) => ({
                id: file.id,
                title: file.name,
                href: file.url,
                meta: `${Math.ceil(file.size / 1024)} KB · ${formatDate(
                  file.uploadedAt,
                )}`,
              }))}
              footer={
                filteredLinks.length ? (
                  <div className="resource-admin-records-footer">
                    <h3>Saved Links</h3>
                    <div className="resource-admin-project-saved-links">
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
          ) : null}

          {activeTab === "Timeline" ? (
            <RecordsPanel
              title="Timeline"
              description="Timeline activity derived from project tickets."
              icon={<FileText size={19} />}
              items={filteredTickets.map((ticket) => ({
                id: ticket.id,
                title: ticket.title,
                href: `/resource-portal/tickets/${ticket.id}`,
                meta: `${formatDate(ticket.updatedAt || ticket.createdAt)} · ${
                  ticket.status
                } · ${ticket.assignee || ticket.reporter || "—"}`,
              }))}
            />
          ) : null}
        </div>
      </div>

      <ResourceProjectDetailsStyles />
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="resource-admin-project-metric-card">
      <span>{label}</span>
      <strong title={value}>{value}</strong>
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
    <div className="resource-admin-project-metric-group">
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function Section({
  title,
  body,
  prominent = false,
}: {
  title: string;
  body: React.ReactNode;
  prominent?: boolean;
}) {
  return (
    <section
      className={
        prominent
          ? "resource-admin-project-section resource-admin-project-section-prominent"
          : "resource-admin-project-section"
      }
    >
      <h2>{title}</h2>
      <div>{typeof body === "string" ? <p>{body}</p> : body}</div>
    </section>
  );
}

function ProjectStatus({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const tone =
    normalized.includes("critical") ||
    normalized.includes("risk") ||
    normalized.includes("delay")
      ? "danger"
      : normalized.includes("complete") || normalized.includes("active")
        ? "success"
        : normalized.includes("hold") ||
            normalized.includes("pause") ||
            normalized.includes("planning")
          ? "warning"
          : "info";

  return (
    <span
      className={`resource-admin-detail-status resource-admin-detail-status-${tone}`}
    >
      {status || "—"}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`resource-admin-detail-priority resource-admin-detail-priority-${priority
        .toLowerCase()
        .replaceAll(" ", "-")}`}
    >
      {priority || "Not Assigned"}
    </span>
  );
}

type RecordItem = {
  id: string;
  title: string;
  href?: string;
  meta?: string;
  avatar?: string;
};

function RecordsPanel({
  title,
  description,
  items,
  avatar = false,
  external = false,
  icon,
  footer,
}: {
  title: string;
  description: string;
  items: RecordItem[];
  avatar?: boolean;
  external?: boolean;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="resource-admin-records-panel">
      <h2>{title}</h2>
      <p className="resource-admin-records-description">{description}</p>

      <div className="resource-admin-records-list">
        {items.length ? (
          items.map((item) => {
            const content = (
              <>
                <div className="resource-admin-records-main">
                  {avatar ? (
                    <span className="resource-admin-record-avatar">
                      {item.avatar ? (
                        <img src={item.avatar} alt="" />
                      ) : (
                        initials(item.title)
                      )}
                    </span>
                  ) : icon ? (
                    <span className="resource-admin-record-icon">{icon}</span>
                  ) : null}

                  <div className="resource-admin-record-copy">
                    <strong>{item.title}</strong>
                    {item.meta ? <small>{item.meta}</small> : null}
                  </div>
                </div>

                {item.href ? (
                  <ChevronRight
                    size={16}
                    className="resource-admin-record-chevron"
                  />
                ) : null}
              </>
            );

            if (!item.href) {
              return (
                <div key={item.id} className="resource-admin-record-row">
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
                  className="resource-admin-record-row"
                >
                  {content}
                </a>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className="resource-admin-record-row"
              >
                {content}
              </Link>
            );
          })
        ) : (
          <div className="resource-admin-records-empty">No records to show.</div>
        )}
      </div>

      {footer}
    </section>
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "R"
  );
}

function ResourceProjectDetailsStyles() {
  return (
    <style>{`
      .resource-admin-project-details,
      .resource-admin-project-details * {
        box-sizing: border-box;
      }

      .resource-admin-project-details {
        display: flex;
        width: 100%;
        min-width: 0;
        flex-direction: column;
        gap: 24px;
        padding-bottom: 28px;
        color: #101828;
        font-family: Geist, var(--font-inter), Inter, Arial, sans-serif;
      }

      .resource-admin-project-metrics {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 8px;
        border-radius: 10px;
        background: #06b6d4;
        padding: 8px;
      }

      .resource-admin-project-metric-card {
        display: flex;
        min-width: 0;
        min-height: 98px;
        flex-direction: column;
        justify-content: center;
        gap: 10px;
        border-radius: 12px;
        background: #ffffff;
        padding: 16px 12px;
        box-shadow: 0 1px 2px rgb(16 24 40 / 0.05);
      }

      .resource-admin-project-metric-card > span,
      .resource-admin-project-metric-group > span {
        display: block;
        color: #475467;
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
      }

      .resource-admin-project-metric-card > strong {
        display: block;
        overflow: hidden;
        color: #101828;
        font-family: "Geist Mono", Geist, monospace;
        font-size: 24px;
        font-weight: 600;
        line-height: 32px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .resource-admin-project-metric-split {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .resource-admin-project-metric-group {
        min-width: 0;
        overflow: hidden;
      }

      .resource-admin-project-metric-group > div {
        display: flex;
        min-width: 0;
        align-items: center;
        margin-top: 8px;
      }

      .resource-admin-detail-status,
      .resource-admin-detail-priority {
        display: inline-flex;
        height: 24px;
        min-width: 0;
        max-width: 112px;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border: 1px solid;
        border-radius: 16px;
        padding: 2px 10px;
        font-family: Inter, var(--font-inter), sans-serif;
        font-size: 12px;
        font-weight: 500;
        line-height: 18px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .resource-admin-detail-status-success,
      .resource-admin-detail-priority-low {
        border-color: #abefc6;
        background: #ecfdf3;
        color: #067647;
      }

      .resource-admin-detail-status-danger,
      .resource-admin-detail-priority-critical {
        border-color: #fecdca;
        background: #fef3f2;
        color: #b42318;
      }

      .resource-admin-detail-status-warning,
      .resource-admin-detail-priority-high {
        border-color: #fedf89;
        background: #fffaeb;
        color: #b54708;
      }

      .resource-admin-detail-status-info,
      .resource-admin-detail-priority-medium {
        border-color: #b2ddff;
        background: #eff8ff;
        color: #175cd3;
      }

      .resource-admin-detail-priority-not-assigned {
        border-color: #d0d5dd;
        background: #f9fafb;
        color: #475467;
      }

      .resource-admin-project-tabs {
        display: flex;
        width: 100%;
        gap: 16px;
        overflow-x: auto;
        border-bottom: 1px solid #eaecf0;
        scrollbar-width: none;
      }

      .resource-admin-project-tabs::-webkit-scrollbar {
        display: none;
      }

      .resource-admin-project-tab {
        display: inline-flex;
        flex: none;
        min-height: 45px;
        align-items: center;
        border: 0;
        border-bottom: 2px solid transparent;
        background: transparent;
        padding: 14px 4px 12px;
        color: #667085;
        font-size: 16px;
        font-weight: 700;
        line-height: 24px;
        cursor: pointer;
      }

      .resource-admin-project-tab:hover {
        color: #344054;
      }

      .resource-admin-project-tab-active {
        border-bottom-color: #06b6d4;
        color: #0284c7;
      }

      .resource-admin-project-tab-content {
        width: 100%;
        min-width: 0;
      }

      .resource-admin-project-overview {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .resource-admin-project-section {
        min-width: 0;
      }

      .resource-admin-project-section h2 {
        margin: 0;
        color: #344054;
        font-family: var(--font-inter), Inter, sans-serif;
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
      }

      .resource-admin-project-section > div {
        margin-top: 8px;
        color: #475467;
        font-size: 16px;
        line-height: 28px;
      }

      .resource-admin-project-section p {
        margin: 0;
        white-space: pre-wrap;
      }

      .resource-admin-project-section-prominent {
        padding-bottom: 24px;
        border-bottom: 1px solid #eaecf0;
      }

      .resource-admin-project-section-prominent h2 {
        color: #101828;
        font-family: Satoshi, var(--font-inter), Inter, sans-serif;
        font-size: 16px;
        font-weight: 600;
        line-height: 24px;
      }

      .resource-admin-project-field-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 24px;
      }

      .resource-admin-project-links {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .resource-admin-project-links a,
      .resource-admin-project-saved-links a {
        display: inline-flex;
        width: fit-content;
        align-items: center;
        gap: 6px;
        color: #475467;
        font-size: 16px;
        line-height: 28px;
        text-decoration: underline;
        text-decoration-color: #d0d5dd;
        text-underline-offset: 4px;
      }

      .resource-admin-project-links a:hover,
      .resource-admin-project-saved-links a:hover {
        color: #0284c7;
      }

      .resource-admin-latest-updates {
        width: 100%;
        overflow: hidden;
        border: 1px solid #eaecf0;
        border-radius: 12px;
        background: #ffffff;
      }

      .resource-admin-latest-updates-header {
        display: flex;
        min-height: 56px;
        align-items: center;
        border-bottom: 1px solid #eaecf0;
        padding: 16px 24px;
      }

      .resource-admin-latest-updates-header h2 {
        margin: 0;
        color: #101828;
        font-family: var(--font-inter), Inter, sans-serif;
        font-size: 16px;
        font-weight: 600;
        line-height: 24px;
      }

      .resource-admin-project-table-scroll {
        width: 100%;
        overflow-x: auto;
      }

      .resource-admin-latest-updates table {
        width: 100%;
        min-width: 760px;
        table-layout: fixed;
        border-collapse: collapse;
      }

      .resource-admin-latest-updates th {
        height: 50px;
        background: #f9fafb;
        padding: 12px 24px;
        color: #475467;
        font-size: 12px;
        font-weight: 600;
        line-height: 18px;
        text-align: left;
      }

      .resource-admin-latest-updates td {
        height: 60px;
        border-top: 1px solid #eaecf0;
        padding: 12px 24px;
        color: #475467;
        font-size: 14px;
        line-height: 20px;
      }

      .resource-admin-latest-updates tr.resource-admin-detail-row-alt {
        background: #f9fafb;
      }

      .resource-admin-latest-updates td:first-child {
        color: #344054;
      }

      .resource-admin-latest-updates a {
        color: #475467;
        font-weight: 500;
        text-decoration: none;
      }

      .resource-admin-latest-updates a:hover {
        color: #0284c7;
      }

      .resource-admin-center {
        text-align: center !important;
      }

      .resource-admin-detail-empty-cell {
        height: 110px !important;
        color: #98a2b3 !important;
        text-align: center !important;
      }

      .resource-admin-records-panel {
        width: 100%;
        border: 1px solid #eaecf0;
        border-radius: 16px;
        background: #ffffff;
        padding: 20px;
      }

      .resource-admin-records-panel > h2 {
        margin: 0;
        color: #101828;
        font-size: 16px;
        font-weight: 600;
        line-height: 24px;
      }

      .resource-admin-records-description {
        margin: 4px 0 0;
        color: #667085;
        font-size: 14px;
        line-height: 20px;
      }

      .resource-admin-records-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 20px;
      }

      .resource-admin-record-row {
        display: flex;
        min-height: 72px;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border: 1px solid #eaecf0;
        border-radius: 12px;
        background: #ffffff;
        padding: 14px 16px;
        color: inherit;
        text-decoration: none;
        transition:
          background-color 0.15s ease,
          border-color 0.15s ease;
      }

      a.resource-admin-record-row:hover {
        border-color: #d0d5dd;
        background: #f9fafb;
      }

      .resource-admin-records-main {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 12px;
      }

      .resource-admin-record-icon,
      .resource-admin-record-avatar {
        display: grid;
        width: 40px;
        height: 40px;
        flex: none;
        place-items: center;
        overflow: hidden;
        border-radius: 10px;
        background: #e6f8fb;
        color: #0284c7;
        font-size: 12px;
        font-weight: 700;
      }

      .resource-admin-record-avatar {
        border-radius: 9999px;
      }

      .resource-admin-record-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .resource-admin-record-copy {
        min-width: 0;
      }

      .resource-admin-record-copy strong,
      .resource-admin-record-copy small {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .resource-admin-record-copy strong {
        color: #101828;
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
      }

      .resource-admin-record-copy small {
        margin-top: 3px;
        color: #667085;
        font-size: 13px;
        line-height: 18px;
      }

      .resource-admin-record-chevron {
        flex: none;
        color: #98a2b3;
      }

      .resource-admin-records-empty {
        padding: 42px 16px;
        color: #98a2b3;
        font-size: 14px;
        text-align: center;
      }

      .resource-admin-records-footer {
        margin-top: 20px;
        border-top: 1px solid #eaecf0;
        padding-top: 20px;
      }

      .resource-admin-records-footer h3 {
        margin: 0;
        color: #344054;
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
      }

      .resource-admin-project-saved-links {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 12px;
      }

      @media (max-width: 1100px) {
        .resource-admin-project-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .resource-admin-project-metric-card:last-child {
          grid-column: span 2;
        }
      }

      @media (max-width: 760px) {
        .resource-admin-project-metrics {
          grid-template-columns: 1fr;
        }

        .resource-admin-project-metric-card:last-child {
          grid-column: auto;
        }

        .resource-admin-project-field-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}