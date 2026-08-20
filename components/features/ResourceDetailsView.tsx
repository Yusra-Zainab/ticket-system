"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  FolderKanban,
  RefreshCcw,
  Search,
} from "lucide-react";

import { type ReactNode, useMemo, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";

import { cn } from "@/lib/utils";

import type { Project, Ticket } from "@/types";

type ResourceLifecycle = "OPEN" | "DRAFT";

type ResourceStatus = "Active" | "Inactive";

type ResourceFormData = {
  firstName?: string;

  lastName?: string;

  jobTitle?: string;

  email?: string;

  phone?: string;

  communicationChannel?: string;

  skills?: string[];

  experienceLevel?: string;

  employmentType?: string;

  department?: string;

  team?: string;

  reportingTo?: string;

  projectId?: string;

  projectRole?: string;

  module?: string;

  subModule?: string;

  responsibilityType?: string;

  status?: ResourceStatus | "active" | "inactive";

  attachments?: Array<{
    id: string;

    name: string;

    mimeType?: string;

    size?: number;

    url: string;

    uploadedAt?: string;
  }>;
};

type ResourceRecord = {
  id: string;

  lifecycle: ResourceLifecycle;

  name: string;

  email: string;

  role: string;

  avatar?: string | null;

  formData?: ResourceFormData;
};

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

  projectId?: string;

  ticket: string;

  ticketId?: string;

  status: string;
};

export default function ResourceDetailsView({
  resource,
  projects,
  tickets,
}: {
  resource: ResourceRecord;

  projects: Project[];

  tickets: Ticket[];
}) {
  const router = useRouter();

  const form = resource.formData ?? {};

  /*
   * Reference page defaults to
   * Overview when opening a resource.
   */
  const [activeTab, setActiveTab] = useState<ResourceTab>("Overview");

  const [moreOpen, setMoreOpen] = useState(false);

  const [projectSearch, setProjectSearch] = useState("");

  const [ticketSearch, setTicketSearch] = useState("");

  const [activityPage, setActivityPage] = useState(1);

  const [activityPageSize, setActivityPageSize] = useState(10);

  const [selectedActivity, setSelectedActivity] = useState<string[]>([]);

  /* =====================================================
     RESOURCE IDENTITY
     ===================================================== */

  const resourceName =
    [form.firstName, form.lastName].filter(Boolean).join(" ").trim() ||
    resource.name ||
    "Untitled Resource";

  const jobTitle = form.jobTitle?.trim() || formatRole(resource.role);

  /*
   * Resource status is intentionally
   * limited to exactly two values.
   *
   * If you later persist formData.status,
   * that value wins. Otherwise an OPEN
   * registered resource is Active.
   */
  const resourceStatus: ResourceStatus = normalizeResourceStatus(
    form.status ?? (resource.lifecycle === "OPEN" ? "Active" : "Inactive"),
  );

  /* =====================================================
     PROJECTS
     ===================================================== */

  const resourceProjects = useMemo(() => {
    return projects.filter((project) => {
      /*
       * Primary source:
       * project team IDs.
       */
      const inProjectTeam =
        project.teamMembers?.some((member) => member.id === resource.id) ??
        false;

      /*
       * Compatibility source:
       * resource form currently stores
       * one assigned project ID.
       */
      const storedProject = form.projectId === project.id;

      return inProjectTeam || storedProject;
    });
  }, [projects, resource.id, form.projectId]);

  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();

    if (!query) {
      return resourceProjects;
    }

    return resourceProjects.filter((project) =>
      [
        project.name,

        project.client,

        project.status,

        project.priority,

        project.formData?.projectType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [resourceProjects, projectSearch]);

  /* =====================================================
     TICKETS
     ===================================================== */

  const resourceTickets = useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          ticket.assignedTo.trim().toLowerCase() ===
          resourceName.trim().toLowerCase(),
      ),
    [tickets, resourceName],
  );

  const filteredTickets = useMemo(() => {
    const query = ticketSearch.trim().toLowerCase();

    if (!query) {
      return resourceTickets;
    }

    return resourceTickets.filter((ticket) =>
      [ticket.title, ticket.project, ticket.status, ticket.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [resourceTickets, ticketSearch]);

  /* =====================================================
     MODULES
     ===================================================== */

  const modules = useMemo(() => {
    const rows: Array<{
      id: string;

      module: string;

      subModule: string;

      responsibility: string;

      project?: Project;
    }> = [];

    if (form.module || form.subModule || form.responsibilityType) {
      rows.push({
        id: "stored-module",

        module: form.module || "—",

        subModule: form.subModule || "—",

        responsibility: form.responsibilityType || "—",

        project: resourceProjects.find(
          (project) => project.id === form.projectId,
        ),
      });
    }

    return rows;
  }, [
    form.module,
    form.subModule,
    form.responsibilityType,
    form.projectId,
    resourceProjects,
  ]);

  /* =====================================================
     ACTIVITY
     ===================================================== */

  const activities: ActivityRow[] = useMemo(() => {
    return [...resourceTickets]
      .sort((a, b) => dateNumber(b.created) - dateNumber(a.created))
      .map((ticket, index) => {
        const project = resourceProjects.find(
          (item) => item.name === ticket.project,
        );

        return {
          id: ticket.id,

          time: formatTime(ticket.created),

          activity: index === 0 ? "Updated ticket" : "Worked on ticket",

          project: ticket.project || "—",

          projectId: project?.id,

          ticket: ticket.title,

          ticketId: ticket.id,

          status: ticket.status,
        };
      });
  }, [resourceTickets, resourceProjects]);

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

  /* =====================================================
     FILES
     ===================================================== */

  const files = useMemo(() => {
    /*
     * Direct resource attachments can
     * be stored here when supported.
     */
    const direct = Array.isArray(form.attachments) ? form.attachments : [];

    /*
     * Until a dedicated resource_files
     * table exists, also surface files
     * from tickets currently assigned
     * to this resource.
     */
    const ticketFiles = resourceTickets.flatMap((ticket) => {
      const attachments = ticket.formData?.attachments;

      if (!Array.isArray(attachments)) {
        return [];
      }

      return attachments.map((attachment) => ({
        ...attachment,

        source: ticket.title,
      }));
    });

    return [
      ...direct.map((file) => ({
        ...file,

        source: "Resource",
      })),

      ...ticketFiles,
    ];
  }, [form.attachments, resourceTickets]);

  /* =====================================================
     SELECTION
     ===================================================== */

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

  return (
    <div className="resource-detail-page">
      {/* =================================================
          HEADER
         ================================================= */}

      <header className="resource-detail-header">
        <div className="resource-detail-title-row">
          <h1>Resource Details</h1>

          <div className="resource-detail-actions">
            <Link
              href={`/resources/${resource.id}/edit`}
              className="resource-detail-action"
            >
              Edit Resource
            </Link>

            <Link
              href={`/resources/${resource.id}/edit?section=projects`}
              className="resource-detail-action"
            >
              Assign Project
            </Link>

            <Link
              href={`/tickets/new?assignedTo=${encodeURIComponent(
                resourceName,
              )}&returnTo=${encodeURIComponent(`/resources/${resource.id}`)}`}
              className="resource-detail-action"
            >
              Assign Ticket
            </Link>

            <div className="relative">
              <button
                type="button"
                className="resource-detail-action"
                onClick={() => setMoreOpen((current) => !current)}
              >
                More
              </button>

              {moreOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close resource actions"
                    className="fixed inset-0 z-30"
                    onClick={() => setMoreOpen(false)}
                  />

                  <div className="resource-detail-more-menu">
                    <Link
                      href={`/resources/${resource.id}/edit`}
                      onClick={() => setMoreOpen(false)}
                    >
                      Edit Resource
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);

                        router.refresh();
                      }}
                    >
                      Refresh Data
                      <RefreshCcw size={15} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* =================================================
          IDENTITY
         ================================================= */}

      <section className="resource-detail-identity">
        <ResourceAvatar src={resource.avatar} name={resourceName} />

        <div className="resource-detail-identity-copy">
          <div className="flex items-center gap-3">
            <h2>{resourceName}</h2>

            <ResourceStatusBadge status={resourceStatus} />
          </div>

          <p>{jobTitle}</p>
        </div>
      </section>

      {/* =================================================
          TABS
         ================================================= */}

      <div className="resource-detail-tabs-shell">
        <nav
          aria-label="Resource details tabs"
          className="resource-detail-tabs"
        >
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

      {/* =================================================
          CONTENT
         ================================================= */}

      <main className="resource-detail-content">
        {activeTab === "Overview" && (
          <OverviewTab
            resource={resource}
            form={form}
            status={resourceStatus}
            projects={resourceProjects}
            tickets={resourceTickets}
          />
        )}

        {activeTab === "Projects" && (
          <ProjectsTab
            projects={filteredProjects}
            query={projectSearch}
            setQuery={setProjectSearch}
          />
        )}

        {activeTab === "Tickets" && (
          <TicketsTab
            tickets={filteredTickets}
            query={ticketSearch}
            setQuery={setTicketSearch}
          />
        )}

        {activeTab === "Modules" && <ModulesTab modules={modules} />}

        {activeTab === "Activity" && (
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
        )}

        {activeTab === "Files" && <FilesTab files={files} />}
      </main>
    </div>
  );
}

/* =========================================================
   OVERVIEW
   ========================================================= */

function OverviewTab({
  resource,
  form,
  status,
  projects,
  tickets,
}: {
  resource: ResourceRecord;

  form: ResourceFormData;

  status: ResourceStatus;

  projects: Project[];

  tickets: Ticket[];
}) {
  return (
    <div className="resource-overview">
      <DetailSection title="Basic Resource Information">
        <div className="resource-detail-grid">
          <DetailValue
            label="First Name"
            value={form.firstName || firstName(resource.name)}
          />

          <DetailValue
            label="Last Name"
            value={form.lastName || lastName(resource.name)}
          />

          <DetailValue label="Status">
            <ResourceStatusBadge status={status} />
          </DetailValue>

          <DetailValue
            label="Email Address"
            value={form.email || resource.email}
          />

          <DetailValue label="Phone Number" value={form.phone} />

          <DetailValue
            label="Communication"
            value={form.communicationChannel}
          />

          <DetailValue
            label="Job Title"
            value={form.jobTitle || formatRole(resource.role)}
          />

          <DetailValue label="Employment Type" value={form.employmentType} />

          <DetailValue label="Experience Level" value={form.experienceLevel} />
        </div>
      </DetailSection>

      <DetailSection title="Skills & Role Details">
        <div className="resource-detail-grid">
          <DetailValue label="Skills">
            <SkillList skills={form.skills} />
          </DetailValue>

          <DetailValue label="Department" value={form.department} />

          <DetailValue label="Team" value={form.team} />
        </div>
      </DetailSection>

      <DetailSection title="Reporting & Team">
        <div className="resource-detail-grid">
          <DetailValue label="Reporting To" value={form.reportingTo} />

          <DetailValue
            label="Assigned Projects"
            value={String(projects.length)}
          />

          <DetailValue
            label="Active Tickets"
            value={String(
              tickets.filter(
                (ticket) =>
                  !["Closed", "Resolved", "Cancelled"].includes(ticket.status),
              ).length,
            )}
          />
        </div>
      </DetailSection>

      <DetailSection title="Project Assignment">
        <div className="resource-detail-grid">
          <DetailValue label="Project Role" value={form.projectRole} />

          <DetailValue label="Module" value={form.module} />

          <DetailValue label="Sub Module" value={form.subModule} />

          <DetailValue label="Responsibility" value={form.responsibilityType} />
        </div>
      </DetailSection>
    </div>
  );
}

/* =========================================================
   PROJECTS
   ========================================================= */

function ProjectsTab({
  projects,
  query,
  setQuery,
}: {
  projects: Project[];

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
                      href={`/projects/${project.id}`}
                      className="resource-detail-record-link"
                    >
                      <FolderKanban size={18} />

                      {project.name}
                    </Link>
                  </td>

                  <td>{project.client}</td>

                  <td>—</td>

                  <td>
                    <span className="resource-project-status">
                      {project.status}
                    </span>
                  </td>
                </tr>
              ))}

              {!projects.length && (
                <EmptyTableRow
                  columns={4}
                  text="No projects assigned to this resource."
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TICKETS
   ========================================================= */

function TicketsTab({
  tickets,
  query,
  setQuery,
}: {
  tickets: Ticket[];

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
                      href={`/tickets/${ticket.id}`}
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

              {!tickets.length && (
                <EmptyTableRow
                  columns={4}
                  text="No tickets assigned to this resource."
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MODULES
   ========================================================= */

function ModulesTab({
  modules,
}: {
  modules: Array<{
    id: string;

    module: string;

    subModule: string;

    responsibility: string;

    project?: Project;
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
                  {module.project ? (
                    <Link
                      href={`/projects/${module.project.id}`}
                      className="resource-detail-record-link"
                    >
                      {module.project.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>

                <td>{module.responsibility}</td>
              </tr>
            ))}

            {!modules.length && (
              <EmptyTableRow columns={4} text="No module assignments found." />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================
   ACTIVITY
   ========================================================= */

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
                  {allSelected && <Check size={13} />}
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
                        {checked && <Check size={13} />}
                      </button>

                      <strong>{row.time}</strong>
                    </div>
                  </td>

                  <td>{row.activity}</td>

                  <td>
                    {row.projectId ? (
                      <Link
                        href={`/projects/${row.projectId}`}
                        className="resource-activity-project"
                      >
                        <span className="resource-activity-project-icon">
                          P
                        </span>

                        {row.project}
                      </Link>
                    ) : (
                      row.project
                    )}
                  </td>

                  <td>
                    {row.ticketId ? (
                      <Link
                        href={`/tickets/${row.ticketId}`}
                        className="resource-detail-record-link"
                      >
                        {row.ticket}
                      </Link>
                    ) : (
                      row.ticket
                    )}
                  </td>

                  <td>
                    <TicketStatusBadge status={row.status} />
                  </td>
                </tr>
              );
            })}

            {!rows.length && (
              <EmptyTableRow
                columns={5}
                text="No activity found for this resource."
              />
            )}
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

/* =========================================================
   FILES
   ========================================================= */

function FilesTab({
  files,
}: {
  files: Array<{
    id: string;

    name: string;

    url: string;

    uploadedAt?: string;

    source?: string;
  }>;
}) {
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
              {file.source || "Resource"}

              {file.uploadedAt ? ` · ${formatDate(file.uploadedAt)}` : ""}
            </small>
          </span>

          <ExternalLink size={18} />
        </a>
      ))}
    </div>
  );
}

/* =========================================================
   SHARED UI
   ========================================================= */

function ResourceAvatar({
  src,
  name,
}: {
  src?: string | null;

  name: string;
}) {
  if (src && src.trim()) {
    return (
      <span className="resource-detail-avatar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} />
      </span>
    );
  }

  return <Avatar name={name} className="!size-16 shrink-0 text-lg" />;
}

function ResourceStatusBadge({ status }: { status: ResourceStatus }) {
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
  const normalized = status.trim().toLowerCase();

  const green = [
    "active",
    "in progress",
    "ready for review",
    "assigned",
    "open",
    "resolved",
  ].includes(normalized);

  return (
    <span
      className={cn(
        "resource-ticket-status",

        green ? "resource-ticket-status-green" : "resource-ticket-status-gray",
      )}
    >
      {status}
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

function SkillList({ skills }: { skills?: string[] }) {
  if (!skills?.length) {
    return <p>—</p>;
  }

  return (
    <div className="resource-detail-skills">
      {skills.map((skill) => (
        <span key={skill}>{skill}</span>
      ))}
    </div>
  );
}

function EmptyTableRow({
  columns,
  text,
}: {
  columns: number;

  text: string;
}) {
  return (
    <tr>
      <td colSpan={columns} className="!h-40 !text-center !text-[#98A2B3]">
        {text}
      </td>
    </tr>
  );
}

function EmptyState({
  title,
  text,
}: {
  title: string;

  text: string;
}) {
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

/* =========================================================
   HELPERS
   ========================================================= */

function normalizeResourceStatus(value: unknown): ResourceStatus {
  return String(value ?? "")
    .trim()
    .toLowerCase() === "inactive"
    ? "Inactive"
    : "Active";
}

function formatRole(value: string) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "";
}

function lastName(name: string) {
  return name.trim().split(/\s+/).slice(1).join(" ");
}

function dateNumber(value: string) {
  const result = new Date(value).getTime();

  return Number.isFinite(result) ? result : 0;
}

function formatTime(value: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",

    minute: "2-digit",
  });
}

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",

    month: "short",

    year: "numeric",
  }).format(date);
}
