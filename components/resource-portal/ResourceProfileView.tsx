"use client";

import Link from "next/link";
import {
  ArrowDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  FolderKanban,
  Search,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import ProjectStatus from "@/components/features/ProjectStatus";
import { Avatar } from "@/components/ui/Avatar";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import type {
  ResourcePortalProfile,
  ResourcePortalProject,
  ResourcePortalTicket,
} from "@/types/resourcePortal";
import type { Status } from "@/types";

const tabs = [
  "Overview",
  "Projects",
  "Tickets",
  "Modules",
  "Activity",
  "Files",
] as const;

type ResourceTab = (typeof tabs)[number];

type ActivityRow = {
  id: string;
  time: string;
  activity: string;
  project: string;
  projectId?: string | null;
  ticket: string;
  ticketId: string;
  status: string;
};

type FileRow = {
  id: string;
  name: string;
  url: string;
  uploadedAt?: string;
  source: string;
};

export default function ResourceProfileView({
  profile,
  projects,
  tickets,
}: {
  profile: ResourcePortalProfile;
  projects: ResourcePortalProject[];
  tickets: ResourcePortalTicket[];
}) {
  const [activeTab, setActiveTab] = useState<ResourceTab>("Overview");
  const [projectSearch, setProjectSearch] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(10);
  const [selectedActivity, setSelectedActivity] = useState<string[]>([]);

  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();
    if (!query) return projects;

    return projects.filter((project) =>
      [
        project.name,
        project.client,
        project.status,
        project.priority,
        project.moduleName,
        project.subModule,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [projectSearch, projects]);

  const filteredTickets = useMemo(() => {
    const query = ticketSearch.trim().toLowerCase();
    if (!query) return tickets;

    return tickets.filter((ticket) =>
      [
        ticket.title,
        ticket.project,
        ticket.status,
        ticket.priority,
        ticket.type,
        ticket.assignee,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [ticketSearch, tickets]);

  const modules = useMemo(
    () =>
      projects
        .filter((project) => project.moduleName || project.subModule)
        .map((project) => ({
          id: project.id,
          module: project.moduleName || "—",
          subModule: project.subModule || "—",
          project,
          responsibility: "Assigned Resource",
        })),
    [projects],
  );

  const activities = useMemo<ActivityRow[]>(() => {
    return [...tickets]
      .sort((a, b) => dateNumber(b.updatedAt) - dateNumber(a.updatedAt))
      .map((ticket) => ({
        id: ticket.id,
        time: formatTime(ticket.updatedAt),
        activity: "Ticket updated",
        project: ticket.project || "—",
        projectId: ticket.projectId,
        ticket: ticket.title,
        ticketId: ticket.id,
        status: ticket.status,
      }));
  }, [tickets]);

  const files = useMemo<FileRow[]>(() => {
    const rows: FileRow[] = [];

    for (const project of projects) {
      for (const file of project.files) {
        rows.push({
          id: `project-${project.id}-${file.id}`,
          name: file.name,
          url: file.url,
          uploadedAt: file.uploadedAt,
          source: project.name,
        });
      }
    }

    for (const ticket of tickets) {
      for (const file of ticket.attachments) {
        rows.push({
          id: `ticket-${ticket.id}-${file.id}`,
          name: file.name,
          url: file.url,
          uploadedAt: file.uploadedAt,
          source: ticket.title,
        });
      }
    }

    return Array.from(new Map(rows.map((row) => [row.id, row])).values());
  }, [projects, tickets]);

  const activityPageCount = Math.max(
    1,
    Math.ceil(activities.length / activityPageSize),
  );
  const currentActivityPage = Math.min(activityPage, activityPageCount);
  const activityStart = (currentActivityPage - 1) * activityPageSize;
  const visibleActivities = activities.slice(
    activityStart,
    activityStart + activityPageSize,
  );

  function toggleActivity(id: string) {
    setSelectedActivity((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleVisibleActivities() {
    const ids = visibleActivities.map((item) => item.id);
    const allSelected =
      ids.length > 0 && ids.every((id) => selectedActivity.includes(id));

    setSelectedActivity((current) =>
      allSelected
        ? current.filter((id) => !ids.includes(id))
        : Array.from(new Set([...current, ...ids])),
    );
  }

  const activeTickets = tickets.filter(
    (ticket) => !["Closed", "Resolved", "Cancelled"].includes(ticket.status),
  ).length;

  const firstProjectWithModule = projects.find(
    (project) => project.moduleName || project.subModule,
  );

  return (
    <div className="resource-detail-page resource-profile-admin-match">
      <header className="resource-detail-header">
        <div className="resource-detail-title-row">
          <h1>Resource Details</h1>

          <div className="resource-detail-actions">
            <Link
              href="/resource/profile/edit"
              className="resource-detail-action"
            >
              Edit Resource
            </Link>
          </div>
        </div>
      </header>

      <section className="resource-detail-identity">
        <ResourceAvatar src={profile.avatar} name={profile.name} />

        <div className="resource-detail-identity-copy">
          <div className="flex items-center gap-3">
            <h2>{profile.name}</h2>
            <ResourceStatusBadge status="Active" />
          </div>
          <p>{profile.jobTitle || formatRole(profile.role)}</p>
        </div>
      </section>

      <div className="resource-detail-tabs-shell">
        <nav aria-label="Resource details tabs" className="resource-detail-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={cn(
                "resource-detail-tab",
                activeTab === tab && "resource-detail-tab-active",
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <main className="resource-detail-content">
        {activeTab === "Overview" ? (
          <div className="resource-overview">
            <DetailSection title="Basic Resource Information">
              <div className="resource-detail-grid">
                <DetailValue label="First Name" value={profile.firstName} />
                <DetailValue label="Last Name" value={profile.lastName} />
                <DetailValue label="Status">
                  <ResourceStatusBadge status="Active" />
                </DetailValue>
                <DetailValue label="Email Address" value={profile.email} />
                <DetailValue label="Phone Number" value={profile.phone} />
                <DetailValue label="Communication" value="Email" />
                <DetailValue
                  label="Job Title"
                  value={profile.jobTitle || formatRole(profile.role)}
                />
                <DetailValue label="Employment Type" value="—" />
                <DetailValue label="Experience Level" value="—" />
              </div>
            </DetailSection>

            <DetailSection title="Skills & Role Details">
              <div className="resource-detail-grid">
                <DetailValue label="Skills" value="—" />
                <DetailValue label="Department" value="—" />
                <DetailValue label="Team" value="—" />
              </div>
            </DetailSection>

            <DetailSection title="Reporting & Team">
              <div className="resource-detail-grid">
                <DetailValue label="Reporting To" value="—" />
                <DetailValue
                  label="Assigned Projects"
                  value={String(projects.length)}
                />
                <DetailValue label="Active Tickets" value={String(activeTickets)} />
              </div>
            </DetailSection>

            <DetailSection title="Project Assignment">
              <div className="resource-detail-grid">
                <DetailValue label="Project Role" value="Resource" />
                <DetailValue
                  label="Module"
                  value={firstProjectWithModule?.moduleName}
                />
                <DetailValue
                  label="Sub Module"
                  value={firstProjectWithModule?.subModule}
                />
                <DetailValue label="Responsibility" value="Assigned Resource" />
              </div>
            </DetailSection>
          </div>
        ) : null}

        {activeTab === "Projects" ? (
          <ProjectsTab
            projects={filteredProjects}
            query={projectSearch}
            setQuery={setProjectSearch}
          />
        ) : null}

        {activeTab === "Tickets" ? (
          <TicketsTab
            tickets={filteredTickets}
            query={ticketSearch}
            setQuery={setTicketSearch}
          />
        ) : null}

        {activeTab === "Modules" ? <ModulesTab modules={modules} /> : null}

        {activeTab === "Activity" ? (
          <ActivityTab
            rows={visibleActivities}
            total={activities.length}
            page={currentActivityPage}
            pageCount={activityPageCount}
            pageSize={activityPageSize}
            pageStart={activityStart}
            selected={selectedActivity}
            onToggle={toggleActivity}
            onToggleAll={toggleVisibleActivities}
            onPage={setActivityPage}
            onPageSize={(size) => {
              setActivityPageSize(size);
              setActivityPage(1);
            }}
          />
        ) : null}

        {activeTab === "Files" ? <FilesTab files={files} /> : null}
      </main>

      <ResourceDetailsStyles />
    </div>
  );
}

function ProjectsTab({
  projects,
  query,
  setQuery,
}: {
  projects: ResourcePortalProject[];
  query: string;
  setQuery: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <label className="resource-detail-search ml-auto">
        <Search size={19} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
        />
      </label>

      <div className="resource-detail-table-frame">
        <div className="overflow-x-auto">
          <table className="resource-detail-table resource-projects-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project, index) => (
                <tr
                  key={project.id}
                  className={index % 2 ? "resource-detail-row-alt" : ""}
                >
                  <td>
                    <Link
                      href={`/resource/projects/${project.id}`}
                      className="resource-detail-record-link"
                    >
                      <FolderKanban size={18} />
                      {project.name}
                    </Link>
                  </td>
                  <td>{project.client}</td>
                  <td>Resource</td>
                  <td>
                    <ProjectStatus status={project.status} size="sm" />
                  </td>
                </tr>
              ))}

              {!projects.length ? (
                <EmptyTableRow
                  columns={4}
                  text="No projects assigned to this resource."
                />
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TicketsTab({
  tickets,
  query,
  setQuery,
}: {
  tickets: ResourcePortalTicket[];
  query: string;
  setQuery: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <label className="resource-detail-search ml-auto">
        <Search size={19} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
        />
      </label>

      <div className="resource-detail-table-frame">
        <div className="overflow-x-auto">
          <table className="resource-detail-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Project</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket, index) => (
                <tr
                  key={ticket.id}
                  className={index % 2 ? "resource-detail-row-alt" : ""}
                >
                  <td>
                    <Link
                      href={`/resource/tickets/${ticket.id}`}
                      className="resource-detail-record-link"
                    >
                      {ticket.title}
                    </Link>
                  </td>
                  <td>{ticket.project || "—"}</td>
                  <td>{formatDate(ticket.dueDate)}</td>
                  <td>
                    <TicketStatusBadge status={ticket.status} />
                  </td>
                </tr>
              ))}

              {!tickets.length ? (
                <EmptyTableRow
                  columns={4}
                  text="No tickets assigned to this resource."
                />
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ModulesTab({
  modules,
}: {
  modules: Array<{
    id: string;
    module: string;
    subModule: string;
    responsibility: string;
    project: ResourcePortalProject;
  }>;
}) {
  return (
    <div className="resource-detail-table-frame">
      <div className="overflow-x-auto">
        <table className="resource-detail-table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Sub Module</th>
              <th>Project</th>
              <th>Responsibility</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((module, index) => (
              <tr
                key={module.id}
                className={index % 2 ? "resource-detail-row-alt" : ""}
              >
                <td>{module.module}</td>
                <td>{module.subModule}</td>
                <td>
                  <Link
                    href={`/resource/projects/${module.project.id}`}
                    className="resource-detail-record-link"
                  >
                    {module.project.name}
                  </Link>
                </td>
                <td>{module.responsibility}</td>
              </tr>
            ))}

            {!modules.length ? (
              <EmptyTableRow columns={4} text="No module assignments found." />
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityTab({
  rows,
  total,
  page,
  pageCount,
  pageSize,
  pageStart,
  selected,
  onToggle,
  onToggleAll,
  onPage,
  onPageSize,
}: {
  rows: ActivityRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  pageStart: number;
  selected: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const allSelected =
    rows.length > 0 && rows.every((row) => selected.includes(row.id));

  return (
    <div className="resource-detail-table-frame">
      <div className="overflow-x-auto">
        <table className="resource-detail-table resource-activity-table">
          <thead>
            <tr>
              <th className="resource-activity-time-header">
                <button
                  type="button"
                  aria-label="Select visible activity"
                  onClick={onToggleAll}
                  className={cn(
                    "resource-detail-checkbox",
                    allSelected && "resource-detail-checkbox-checked",
                  )}
                >
                  {allSelected ? <Check size={13} /> : null}
                </button>
                <span>Time</span>
                <ArrowDown size={16} />
              </th>
              <th>Activity</th>
              <th>Project</th>
              <th>Ticket</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const checked = selected.includes(row.id);
              return (
                <tr
                  key={row.id}
                  className={index % 2 ? "resource-detail-row-alt" : ""}
                >
                  <td>
                    <div className="resource-activity-time">
                      <button
                        type="button"
                        aria-label={`Select ${row.time}`}
                        onClick={() => onToggle(row.id)}
                        className={cn(
                          "resource-detail-checkbox",
                          checked && "resource-detail-checkbox-checked",
                        )}
                      >
                        {checked ? <Check size={13} /> : null}
                      </button>
                      <strong>{row.time}</strong>
                    </div>
                  </td>
                  <td>{row.activity}</td>
                  <td>
                    {row.projectId ? (
                      <Link
                        href={`/resource/projects/${row.projectId}`}
                        className="resource-activity-project"
                      >
                        <span className="resource-activity-project-icon">P</span>
                        {row.project}
                      </Link>
                    ) : (
                      row.project
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/resource/tickets/${row.ticketId}`}
                      className="resource-detail-record-link"
                    >
                      {row.ticket}
                    </Link>
                  </td>
                  <td>
                    <TicketStatusBadge status={row.status} />
                  </td>
                </tr>
              );
            })}

            {!rows.length ? (
              <EmptyTableRow
                columns={5}
                text="No activity found for this resource."
              />
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="resource-detail-pagination">
        <span>
          {total ? pageStart + 1 : 0}
          {" - "}
          {Math.min(pageStart + pageSize, total)}
          {" of "}
          {total}
        </span>

        <select
          value={pageSize}
          onChange={(event) => onPageSize(Number(event.target.value))}
          aria-label="Rows per page"
        >
          <option value="10">10 per page</option>
          <option value="20">20 per page</option>
          <option value="50">50 per page</option>
        </select>

        <div className="resource-detail-pagination-buttons">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPage(Math.max(1, page - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => onPage(Math.min(pageCount, page + 1))}
            aria-label="Next page"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FilesTab({ files }: { files: FileRow[] }) {
  if (!files.length) {
    return (
      <EmptyState
        title="No files"
        text="No files are currently associated with this resource."
      />
    );
  }

  return (
    <div className="resource-files-list">
      {files.map((file) => (
        <a
          key={file.id}
          href={file.url}
          target="_blank"
          rel="noreferrer"
          className="resource-file-row"
        >
          <span className="resource-file-icon">
            <FileText size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <strong>{file.name}</strong>
            <small>
              {file.source}
              {file.uploadedAt ? ` · ${formatDate(file.uploadedAt)}` : ""}
            </small>
          </span>
          <ExternalLink size={18} />
        </a>
      ))}
    </div>
  );
}

function ResourceAvatar({ src, name }: { src?: string | null; name: string }) {
  if (src?.trim()) {
    return (
      <span className="resource-detail-avatar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} />
      </span>
    );
  }

  return <Avatar name={name} className="!size-16 shrink-0 text-lg" />;
}

function ResourceStatusBadge({ status }: { status: "Active" | "Inactive" }) {
  return (
    <span
      className={cn(
        "resource-status-badge",
        status === "Active"
          ? "resource-status-active"
          : "resource-status-inactive",
      )}
    >
      {status}
    </span>
  );
}

function TicketStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={normalizeTicketStatus(status)} size="sm" />;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="resource-detail-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function DetailValue({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className="resource-detail-value">
      <span>{label}</span>
      {children ?? <p>{value?.trim() || "—"}</p>}
    </div>
  );
}

function EmptyTableRow({ columns, text }: { columns: number; text: string }) {
  return (
    <tr>
      <td colSpan={columns} className="!h-40 !text-center !text-[#98A2B3]">
        {text}
      </td>
    </tr>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="resource-detail-empty">
      <span>
        <FileText size={24} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function normalizeTicketStatus(value: string): Status {
  switch (String(value ?? "").trim()) {
    case "Assigned":
      return "Assigned";
    case "Active":
    case "In Progress":
      return "In Progress";
    case "Blocked":
      return "Blocked";
    case "QA":
    case "Validation":
    case "Ready for Review":
      return "Ready for Review";
    case "Closed":
    case "Resolved":
    case "Cancelled":
      return "Closed";
    default:
      return "Open";
  }
}

function formatRole(value: string) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateNumber(value: string) {
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : 0;
}

function formatTime(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function ResourceDetailsStyles() {
  return <style>{`.resource-detail-page {
  width: 100%;
  min-width: 0;
  padding-bottom: 110px;
  background: #ffffff;
}

/* =========================================================
   HEADER
   ========================================================= */

.resource-detail-header {
  position: sticky;
  top: 0;
  z-index: 24;

  width: 100%;

  border-bottom: 1px solid #eaecf0;

  background: rgb(255 255 255 / 0.97);

  padding: 12px 0 16px;

  backdrop-filter: blur(8px);
}

.resource-detail-title-row {
  display: flex;

  min-height: 40px;

  align-items: center;
  justify-content: space-between;

  gap: 24px;
}

.resource-detail-title-row h1 {
  margin: 0;

  color: #101828;

  font-family: Satoshi, var(--font-satoshi), sans-serif;

  font-size: 30px;
  font-weight: 700;
  line-height: 38px;
}

.resource-detail-actions {
  display: flex;

  align-items: center;

  gap: 12px;
}

.resource-detail-action {
  display: inline-flex;

  min-height: 40px;

  align-items: center;
  justify-content: center;

  border: 1px solid #06b6d4;
  border-radius: 8px;

  background: #ffffff;

  padding: 10px 14px;

  color: #0284c7;

  font-family: Geist, sans-serif;

  font-size: 14px;
  font-weight: 600;
  line-height: 20px;

  text-decoration: none;

  box-shadow: 0 1px 2px rgb(16 24 40 / 0.05);
}

.resource-detail-action:hover {
  background: #e6f8fb;
}

/* =========================================================
   MORE MENU
   ========================================================= */

.resource-detail-more-menu {
  position: absolute;

  top: calc(100% + 6px);
  right: 0;

  z-index: 40;

  display: flex;

  width: 190px;

  flex-direction: column;

  border: 1px solid #eaecf0;
  border-radius: 8px;

  background: #ffffff;

  padding: 5px;

  box-shadow: 0 12px 28px rgb(16 24 40 / 0.15);
}

.resource-detail-more-menu a,
.resource-detail-more-menu button {
  display: flex;

  min-height: 40px;

  width: 100%;

  align-items: center;
  justify-content: space-between;

  border: 0;
  border-radius: 6px;

  background: transparent;

  padding: 8px 10px;

  color: #344054;

  font-size: 14px;
  font-weight: 500;

  text-align: left;
  text-decoration: none;
}

.resource-detail-more-menu a:hover,
.resource-detail-more-menu button:hover {
  background: #f9fafb;
}

/* =========================================================
   IDENTITY
   ========================================================= */

.resource-detail-identity {
  display: flex;

  min-height: 96px;

  align-items: center;

  gap: 24px;

  padding: 24px 0;
}

.resource-detail-avatar {
  position: relative;

  display: inline-flex;

  width: 64px;
  height: 64px;

  flex: none;

  overflow: hidden;

  border: 1.5px solid #ffffff;
  border-radius: 999px;

  background: #f2f4f7;

  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08);
}

.resource-detail-avatar img {
  width: 100%;
  height: 100%;

  object-fit: cover;
}

.resource-detail-identity-copy {
  min-width: 0;
}

.resource-detail-identity-copy h2 {
  margin: 0;

  color: #101828;

  font-family: Satoshi, var(--font-satoshi), sans-serif;

  font-size: 24px;
  font-weight: 700;
  line-height: 32px;
}

.resource-detail-identity-copy > p {
  margin: 0;

  color: #101828;

  font-family: Geist, sans-serif;

  font-size: 20px;
  font-weight: 500;
  line-height: 30px;
}

/* =========================================================
   RESOURCE STATUS
   ONLY ACTIVE + INACTIVE
   ========================================================= */

.resource-status-badge {
  display: inline-flex;

  height: 22px;
  min-width: 64px;

  align-items: center;
  justify-content: center;

  border: 1px solid;
  border-radius: 16px;

  padding: 2px 8px;

  font-family: Inter, sans-serif;

  font-size: 12px;
  font-weight: 500;
  line-height: 18px;

  white-space: nowrap;
}

.resource-status-active {
  border-color: #abefc6;
  background: #ecfdf3;
  color: #067647;
}

.resource-status-inactive {
  border-color: #d0d5dd;
  background: #f9fafb;
  color: #475467;
}

/* =========================================================
   TABS
   ========================================================= */

.resource-detail-tabs-shell {
  width: 100%;

  overflow-x: auto;

  border-bottom: 1px solid #eaecf0;
}

.resource-detail-tabs {
  display: flex;

  width: max-content;
  min-width: 100%;

  align-items: flex-start;

  gap: 12px;
}

.resource-detail-tab {
  display: inline-flex;

  height: 36px;

  align-items: center;
  justify-content: center;

  border: 0;
  border-bottom: 2px solid transparent;

  background: transparent;

  padding: 0 10px 12px;

  color: #667085;

  font-family: Geist, sans-serif;

  font-size: 16px;
  font-weight: 600;
  line-height: 24px;

  white-space: nowrap;

  cursor: pointer;
}

.resource-detail-tab:hover {
  color: #344054;
}

.resource-detail-tab-active {
  border-bottom-color: #06b6d4;

  color: #0284c7;
}

/* =========================================================
   MAIN CONTENT
   ========================================================= */

.resource-detail-content {
  width: 100%;

  padding-top: 32px;
}

/* =========================================================
   OVERVIEW
   ========================================================= */

.resource-overview {
  display: flex;

  flex-direction: column;

  gap: 32px;
}

.resource-detail-section {
  display: flex;

  flex-direction: column;

  gap: 16px;
}

.resource-detail-section > h2 {
  margin: 0;

  color: #101828;

  font-family: Geist, sans-serif;

  font-size: 20px;
  font-weight: 600;
  line-height: 30px;
}

.resource-detail-grid {
  display: grid;

  grid-template-columns: repeat(3, minmax(0, 1fr));

  gap: 16px;
}

.resource-detail-value {
  display: flex;

  min-width: 0;
  min-height: 52px;

  flex-direction: column;

  gap: 8px;
}

.resource-detail-value > span:first-child {
  color: #344054;

  font-family: Inter, sans-serif;

  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.resource-detail-value p {
  margin: 0;

  color: #667085;

  font-family: Geist, sans-serif;

  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

/* =========================================================
   SKILLS
   ========================================================= */

.resource-detail-skills {
  display: flex;

  flex-wrap: wrap;

  gap: 6px;
}

.resource-detail-skills span {
  display: inline-flex;

  min-height: 24px;

  align-items: center;

  border: 1px solid #e4e7ec;
  border-radius: 999px;

  background: #ffffff;

  padding: 3px 8px;

  color: #475467;

  font-size: 12px;
  font-weight: 500;
}

/* =========================================================
   SEARCH
   ========================================================= */

.resource-detail-search {
  display: flex;

  width: 320px;
  height: 44px;

  align-items: center;

  gap: 8px;

  border: 1px solid #d0d5dd;
  border-radius: 8px;

  background: #ffffff;

  padding: 10px 14px;

  color: #667085;

  box-shadow: 0 1px 2px rgb(16 24 40 / 0.05);
}

.resource-detail-search:focus-within {
  border-color: #0284c7;

  box-shadow: 0 0 0 3px rgb(2 132 199 / 0.08);
}

.resource-detail-search input {
  min-width: 0;

  width: 100%;

  border: 0;

  background: transparent;

  color: #344054;

  font-size: 16px;

  outline: none;
}

.resource-detail-search input::placeholder {
  color: #98a2b3;
}

/* =========================================================
   TABLE
   ========================================================= */

.resource-detail-table-frame {
  width: 100%;

  overflow: hidden;

  border: 1px solid #eaecf0;
  border-radius: 12px;

  background: #ffffff;

  box-shadow: 0 1px 2px rgb(16 24 40 / 0.05);
}

.resource-detail-table {
  width: 100%;

  min-width: 900px;

  table-layout: fixed;

  border-collapse: collapse;
}

.resource-detail-table thead {
  background: #f9fafb;
}

.resource-detail-table th {
  height: 44px;

  border-bottom: 1px solid #eaecf0;

  padding: 12px 16px;

  color: #475467;

  font-family: Geist, sans-serif;

  font-size: 12px;
  font-weight: 600;
  line-height: 18px;

  text-align: center;
}

.resource-detail-table td {
  height: 72px;

  border-bottom: 1px solid #eaecf0;

  padding: 16px;

  color: #475467;

  font-family: Geist, sans-serif;

  font-size: 14px;
  font-weight: 400;
  line-height: 20px;

  text-align: center;
}

.resource-detail-table tbody tr:last-child td {
  border-bottom: 0;
}

.resource-detail-row-alt {
  background: #f2f4f7;
}

.resource-detail-record-link {
  display: inline-flex;

  align-items: center;

  gap: 8px;

  color: #344054;

  font-weight: 500;

  text-decoration: none;
}

.resource-detail-record-link:hover {
  color: #0284c7;
}

/* =========================================================
   PROJECT STATUS INSIDE RESOURCE TABLE
   ========================================================= */

.resource-project-status {
  display: inline-flex;

  min-height: 22px;

  align-items: center;
  justify-content: center;

  border: 1px solid #abefc6;
  border-radius: 16px;

  background: #ecfdf3;

  padding: 2px 8px;

  color: #067647;

  font-family: Inter, sans-serif;

  font-size: 12px;
  font-weight: 500;
}

/* =========================================================
   ACTIVITY TABLE
   ========================================================= */

.resource-activity-table {
  min-width: 1050px;
}

.resource-activity-table th:first-child,
.resource-activity-table td:first-child {
  width: 270px;

  text-align: left;

  padding-left: 32px;
}

.resource-activity-table th:nth-child(2),
.resource-activity-table td:nth-child(2) {
  width: 230px;
}

.resource-activity-table th:nth-child(3),
.resource-activity-table td:nth-child(3) {
  width: 220px;
}

.resource-activity-table th:nth-child(4),
.resource-activity-table td:nth-child(4) {
  width: 280px;
}

.resource-activity-table th:nth-child(5),
.resource-activity-table td:nth-child(5) {
  width: 150px;
}

.resource-activity-time-header {
  display: flex;

  align-items: center;

  gap: 12px;
}

.resource-activity-time {
  display: flex;

  align-items: center;

  gap: 12px;
}

.resource-activity-time strong {
  color: #101828;

  font-weight: 500;
}

.resource-detail-checkbox {
  display: grid;

  width: 20px;
  height: 20px;

  flex: none;

  place-items: center;

  border: 1px solid #d0d5dd;
  border-radius: 6px;

  background: #ffffff;

  color: #ffffff;
}

.resource-detail-checkbox-checked {
  border-color: #0284c7;

  background: #0284c7;
}

.resource-activity-project {
  display: inline-flex;

  align-items: center;

  gap: 10px;

  color: #475467;

  text-decoration: none;
}

.resource-activity-project:hover {
  color: #0284c7;
}

.resource-activity-project-icon {
  display: grid;

  width: 32px;
  height: 32px;

  flex: none;

  place-items: center;

  border-radius: 4px;

  background: #ffffff;

  color: #0284c7;

  font-size: 10px;
  font-weight: 700;

  box-shadow: inset 0 0 0 1px #eaecf0;
}

/* =========================================================
   TICKET STATUS
   ========================================================= */

.resource-ticket-status {
  display: inline-flex;

  min-height: 22px;

  align-items: center;
  justify-content: center;

  border: 1px solid;
  border-radius: 16px;

  padding: 2px 8px;

  font-family: Inter, sans-serif;

  font-size: 12px;
  font-weight: 500;
  line-height: 18px;

  white-space: nowrap;
}

.resource-ticket-status-green {
  border-color: #abefc6;

  background: #ecfdf3;

  color: #067647;
}

.resource-ticket-status-gray {
  border-color: #eaecf0;

  background: #f9fafb;

  color: #344054;
}

/* =========================================================
   PAGINATION
   ========================================================= */

.resource-detail-pagination {
  display: flex;

  min-height: 60px;

  align-items: center;
  justify-content: flex-end;

  gap: 12px;

  border-top: 1px solid #eaecf0;

  background: #ffffff;

  padding: 12px 24px;
}

.resource-detail-pagination > span {
  color: #475467;

  font-size: 12px;

  white-space: nowrap;
}

.resource-detail-pagination select {
  width: 130px;
  height: 36px;

  border: 1px solid #d0d5dd;
  border-radius: 8px;

  background: #ffffff;

  padding: 8px 12px;

  color: #344054;

  font-size: 14px;
  font-weight: 600;

  outline: none;
}

.resource-detail-pagination-buttons {
  display: flex;
}

.resource-detail-pagination-buttons button {
  display: grid;

  width: 36px;
  height: 36px;

  place-items: center;

  border: 1px solid #d0d5dd;

  background: #ffffff;

  color: #344054;
}

.resource-detail-pagination-buttons button:first-child {
  border-radius: 8px 0 0 8px;
}

.resource-detail-pagination-buttons button:last-child {
  margin-left: -1px;

  border-radius: 0 8px 8px 0;
}

.resource-detail-pagination-buttons button:disabled {
  cursor: not-allowed;

  color: #d0d5dd;
}

/* =========================================================
   FILES
   ========================================================= */

.resource-files-list {
  display: flex;

  flex-direction: column;

  gap: 8px;
}

.resource-file-row {
  display: flex;

  min-height: 72px;

  align-items: center;

  gap: 12px;

  border: 1px solid #eaecf0;
  border-radius: 12px;

  background: #ffffff;

  padding: 16px;

  color: #475467;

  text-decoration: none;
}

.resource-file-row:hover {
  background: #f9fafb;
}

.resource-file-icon {
  display: grid;

  width: 40px;
  height: 40px;

  flex: none;

  place-items: center;

  border-radius: 8px;

  background: #e6f8fb;

  color: #0284c7;
}

.resource-file-row strong {
  display: block;

  overflow: hidden;

  color: #344054;

  font-size: 14px;
  font-weight: 500;

  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-file-row small {
  display: block;

  margin-top: 2px;

  color: #667085;

  font-size: 13px;
}

/* =========================================================
   EMPTY
   ========================================================= */

.resource-detail-empty {
  display: flex;

  min-height: 260px;

  flex-direction: column;

  align-items: center;
  justify-content: center;

  border: 1px solid #eaecf0;
  border-radius: 12px;

  background: #ffffff;

  text-align: center;
}

.resource-detail-empty > span {
  display: grid;

  width: 48px;
  height: 48px;

  place-items: center;

  border-radius: 50%;

  background: #e6f8fb;

  color: #0284c7;
}

.resource-detail-empty h3 {
  margin: 12px 0 0;

  color: #101828;

  font-size: 16px;
  font-weight: 600;
}

.resource-detail-empty p {
  margin: 5px 0 0;

  color: #667085;

  font-size: 14px;
}

/* =========================================================
   RESPONSIVE
   ========================================================= */

@media (max-width: 1000px) {
  .resource-detail-title-row {
    align-items: flex-start;

    flex-direction: column;
  }

  .resource-detail-actions {
    flex-wrap: wrap;
  }

  .resource-detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .resource-detail-identity {
    align-items: flex-start;
  }

  .resource-detail-identity-copy h2 {
    font-size: 21px;
  }

  .resource-detail-identity-copy > p {
    font-size: 16px;
  }

  .resource-detail-grid {
    grid-template-columns: 1fr;
  }


.resource-profile-admin-match {
  padding: 24px 32px 110px;
}

@media (max-width: 760px) {
  .resource-profile-admin-match {
    padding: 20px 16px 100px;
  }
}
`}</style>;
}