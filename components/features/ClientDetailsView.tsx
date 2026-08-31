"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Search,
} from "lucide-react";

import { type ReactNode, useMemo, useState } from "react";

import ClientStatusBadge from "@/components/features/ClientStatusBadge";
import ProjectStatus from "@/components/features/ProjectStatus";
import { Avatar } from "@/components/ui/Avatar";
import StatusBadge from "@/components/ui/StatusBadge";

import { cn, formatDate } from "@/lib/utils";

import type { ClientEditorRecord, Project, Ticket, User } from "@/types";

const tabs = [
  "Overview",
  "Projects",
  "Tickets",
  "Team",
  "Communication",
  "Files",
  "Activity",
  "Settings",
] as const;

type ClientTab = (typeof tabs)[number];

const pageSizes = [10, 20, 50] as const;

export default function ClientDetailsView({
  client,
  projects,
  tickets,
  users,
  initialTab,
  allowClientEdit = true,
  allowAssignClientProjects = true,
  allowManageClientTeam = true,
  clientBaseHref = "/clients",
  ticketBaseHref = "/tickets",
}: {
  client: ClientEditorRecord;
  projects: Project[];
  tickets: Ticket[];
  users: User[];
  initialTab?: string;
  allowClientEdit?: boolean;
  allowAssignClientProjects?: boolean;
  allowManageClientTeam?: boolean;
  clientBaseHref?: string;
  ticketBaseHref?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const form = client.formData;
  const visibleTabs = allowManageClientTeam
    ? tabs
    : (tabs.filter((tab) => tab !== "Team") as readonly ClientTab[]);

  const normalizeTab = (value?: string): ClientTab =>
    visibleTabs.find((tab) => tab.toLowerCase() === String(value ?? "").trim().toLowerCase()) ?? "Overview";

  /*
   * Overview is intentionally the
   * default tab.
   */
  const [activeTab, setActiveTab] = useState<ClientTab>(() =>
    normalizeTab(initialTab),
  );

  const [query, setQuery] = useState("");

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(10);

  const [moreOpen, setMoreOpen] = useState(false);

  const clientName = form.clientName?.trim() || "Untitled Client";

  const clientType = form.clientType?.trim() || "Client";

  const industry = form.industry?.trim() || "—";

  /*
   * Primary source of truth is the
   * project.clientId relationship.
   *
   * projectIds is retained as a
   * compatibility fallback for clients
   * saved through the client form.
   */
  const clientProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          project.clientId === client.id ||
          form.projectIds?.includes(project.id),
      ),
    [projects, client.id, form.projectIds],
  );

  const projectNames = useMemo(
    () => new Set(clientProjects.map((project) => project.name)),
    [clientProjects],
  );

  const clientTickets = useMemo(
    () => tickets.filter((ticket) => projectNames.has(ticket.project)),
    [tickets, projectNames],
  );

  const accountManager = users.find(
    (user) => user.id === form.accountManagerId,
  );

  const coordinator = users.find((user) => user.id === form.coordinatorId);

  const projectTeam = useMemo(() => {
    const members = clientProjects.flatMap(
      (project) => project.teamMembers ?? [],
    );

    return Array.from(
      new Map(members.map((member) => [member.id, member])).values(),
    );
  }, [clientProjects]);

  const clientFiles = useMemo(() => {
    const projectFiles = clientProjects.flatMap((project) => {
      const attachments = Array.isArray(project.formData?.attachments)
        ? project.formData.attachments
        : [];

      return attachments.map((attachment) => ({
        id: `project-${project.id}-${attachment.id}`,
        name: attachment.name,
        source: project.name,
        kind: "Project File",
        url: attachment.url,
        uploadedAt: attachment.uploadedAt,
      }));
    });

    const ticketFiles = clientTickets.flatMap((ticket) => {
      const attachments = Array.isArray(ticket.formData?.attachments)
        ? ticket.formData.attachments
        : [];

      return attachments.map((attachment) => ({
        id: `ticket-${ticket.id}-${attachment.id}`,
        name: attachment.name,
        source: ticket.title,
        kind: "Ticket File",
        url: attachment.url,
        uploadedAt: attachment.uploadedAt,
      }));
    });

    return [...projectFiles, ...ticketFiles].sort(
      (left, right) =>
        new Date(right.uploadedAt).getTime() -
        new Date(left.uploadedAt).getTime(),
    );
  }, [clientProjects, clientTickets]);

  const search = query.trim().toLowerCase();

  const filteredProjects = useMemo(
    () =>
      search
        ? clientProjects.filter((project) =>
            [
              project.name,
              project.status,
              project.priority,
              project.formData?.projectType,
              project.teamMembers.map((member) => member.name).join(" "),
            ]
              .join(" ")
              .toLowerCase()
              .includes(search),
          )
        : clientProjects,
    [clientProjects, search],
  );

  const filteredTickets = useMemo(
    () =>
      search
        ? clientTickets.filter((ticket) =>
            [
              ticket.title,
              ticket.project,
              ticket.status,
              ticket.assignedTo,
              ticket.reporter,
              ticket.tags.join(" "),
            ]
              .join(" ")
              .toLowerCase()
              .includes(search),
          )
        : clientTickets,
    [clientTickets, search],
  );

  const filteredTeam = useMemo(
    () =>
      search
        ? projectTeam.filter((member) =>
            `${member.name} ${member.role}`.toLowerCase().includes(search),
          )
        : projectTeam,
    [projectTeam, search],
  );

  return (
    <div className="client-details-page">
      {/* =================================================
          TOP HEADER
         ================================================= */}

      <header className="client-details-header">
        <div className="client-details-title-row">
          <h1>Client Details</h1>

          <div className="client-details-actions">
            {allowClientEdit && (
              <Link
                href={`${clientBaseHref}/${client.id}/edit`}
                className="client-detail-action"
              >
                Edit Client
              </Link>
            )}

            {allowAssignClientProjects && (
              <Link
                href={`${clientBaseHref}/${client.id}/edit?section=projects`}
                className="client-detail-action"
              >
                Assign Project
              </Link>
            )}

            <Link
              href={`${ticketBaseHref}/new?clientId=${encodeURIComponent(client.id)}`}
              className="client-detail-action"
            >
              Create Ticket
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((current) => !current)}
                className="client-detail-action"
              >
                More
                <ChevronDown size={16} />
              </button>

              {moreOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close menu"
                    className="fixed inset-0 z-30"
                    onClick={() => setMoreOpen(false)}
                  />

                  <div className="client-detail-more-menu">
                    {form.website && (
                      <a href={form.website} target="_blank" rel="noreferrer">
                        Open Website
                        <ExternalLink size={15} />
                      </a>
                    )}

                    {allowClientEdit && (
                      <Link href={`${clientBaseHref}/${client.id}/edit`}>
                        Client Settings
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* =================================================
          CLIENT IDENTITY
         ================================================= */}

      <section className="client-identity">
        <ClientLogo name={clientName} />

        <div>
          <h2>{clientName}</h2>

          <p>
            {industry}
            {" · "}
            {clientType}
            {clientType === "Company" ? " Client" : ""}
          </p>
        </div>
      </section>

      {/* =================================================
          TABS
         ================================================= */}

      <div className="client-detail-tabs-shell">
        <nav aria-label="Client details tabs" className="client-detail-tabs">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                const params = new URLSearchParams(searchParams.toString());
                if (tab === "Overview") {
                  params.delete("tab");
                } else {
                  params.set("tab", tab.toLowerCase());
                }
                router.replace(
                  params.size ? `${pathname}?${params.toString()}` : pathname,
                  { scroll: false },
                );

                setQuery("");

                setPage(1);
              }}
              className={cn(
                "client-detail-tab",
                activeTab === tab && "client-detail-tab-active",
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* =================================================
          TAB CONTENT
         ================================================= */}

      <div className="client-detail-content">
        {activeTab === "Overview" && (
          <OverviewTab
            client={client}
            accountManager={accountManager}
            coordinator={coordinator}
          />
        )}

        {activeTab === "Projects" && (
          <ProjectsTab
            projects={filteredProjects}
            query={query}
            setQuery={setQuery}
            filtersOpen={filtersOpen}
            setFiltersOpen={setFiltersOpen}
            page={page}
            setPage={setPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
          />
        )}

        {activeTab === "Tickets" && (
          <SimpleListTab
            title="Tickets"
            query={query}
            setQuery={setQuery}
            rows={filteredTickets.map((ticket) => ({
              id: ticket.id,
              title: ticket.title,
              subtitle: ticket.project,
              meta: ticket.status,
              metaNode: <StatusBadge status={ticket.status} size="sm" />,
              href: `/tickets/${ticket.id}`,
            }))}
          />
        )}

        {activeTab === "Team" && (
          <TeamTab members={filteredTeam} query={query} setQuery={setQuery} />
        )}

        {activeTab === "Communication" && <CommunicationTab client={client} />}

        {activeTab === "Files" && <FilesTab files={clientFiles} />}

        {activeTab === "Activity" && (
          <ActivityTab projects={clientProjects} tickets={clientTickets} />
        )}

        {activeTab === "Settings" && (
          <SettingsTab
            clientId={client.id}
            clientBaseHref={clientBaseHref}
            allowClientEdit={allowClientEdit}
          />
        )}
      </div>
    </div>
  );
}

/* =========================================================
   OVERVIEW
   ========================================================= */

function OverviewTab({
  client,
  accountManager,
  coordinator,
}: {
  client: ClientEditorRecord;
  accountManager?: User;
  coordinator?: User;
}) {
  const form = client.formData;

  const showUpwork = form.clientSource === "Upwork";

  return (
    <div className="client-overview">
      <DetailSection title="Basic Client Information">
        <DetailGrid>
          <DetailValue label="Client / Company Name" value={form.clientName} />

          <DetailValue label="Client Type" value={form.clientType} />

          <DetailValue label="Client Source" value={form.clientSource} />

          <DetailValue label="Industry" value={form.industry} />

          <DetailValue label="Website" value={form.website} link />

          <DetailValue label="Client Status">
            <ClientStatusBadge
              status={normalizeClientStatus(form.clientStatus)}
            />
          </DetailValue>
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Primary Contact">
        <div className="mb-4 flex items-center gap-3">
          <Avatar
            name={form.primaryContactName || "Primary contact"}
            src={form.primaryContactAvatar}
            className="size-12"
          />
          <div>
            <strong className="block text-sm text-[#101828]">
              {form.primaryContactName || "—"}
            </strong>
            <small className="text-[#667085]">
              {form.primaryJobTitle || form.primaryEmail || ""}
            </small>
          </div>
        </div>
        <DetailGrid>
          <DetailValue label="Full Name" value={form.primaryContactName} />

          <DetailValue label="Job Title" value={form.primaryJobTitle} />

          <DetailValue label="Email Address" value={form.primaryEmail} />

          <DetailValue label="Phone Number" value={form.primaryPhone} />

          <DetailValue
            label="Preferred Contact"
            value={form.preferredContact}
          />
        </DetailGrid>
      </DetailSection>

      {showUpwork && (
        <DetailSection title="Upwork Details">
          <DetailGrid>
            <DetailValue
              label="Upwork Profile Name"
              value={form.upworkProfileName}
            />

            <DetailValue
              label="Upwork Profile URL"
              value={form.upworkProfileUrl}
              link
            />

            <DetailValue label="Contract ID" value={form.upworkContractId} />

            <DetailValue label="Phone" value={form.upworkPhone} />

            <DetailValue label="Contract Type" value={form.contractType} />

            <DetailValue label="Budget / Rate" value={form.budgetRate} />

            <DetailValue label="Contract Status">
              <ClientStatusBadge
                status={normalizeClientStatus(form.contractStatus)}
              />
            </DetailValue>
          </DetailGrid>
        </DetailSection>
      )}

      <DetailSection title="Communication Channels">
        <DetailGrid>
          <DetailValue label="WhatsApp Number" value={form.whatsappNumber} />

          <DetailValue label="Viber Number" value={form.viberNumber} />

          <DetailValue
            label="Communication Preference"
            value={form.communicationPreference}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Project Assignment">
        <DetailGrid>
          <DetailValue label="Account Manager" value={accountManager?.name} />

          <DetailValue label="Project Coordinator" value={coordinator?.name} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Internal Notes">
        <div
          className="client-detail-notes"
          dangerouslySetInnerHTML={{
            __html: form.internalNotes || "<p>No internal notes saved.</p>",
          }}
        />
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
  filtersOpen,
  setFiltersOpen,
  page,
  setPage,
  pageSize,
  setPageSize,
}: {
  projects: Project[];
  query: string;
  setQuery: (value: string) => void;
  filtersOpen: boolean;
  setFiltersOpen: (value: boolean) => void;
  page: number;
  setPage: (value: number | ((current: number) => number)) => void;
  pageSize: number;
  setPageSize: (value: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(projects.length / pageSize));

  const currentPage = Math.min(page, pageCount);

  const start = (currentPage - 1) * pageSize;

  const visible = projects.slice(start, start + pageSize);

  return (
    <div className="space-y-6">
      <div className="client-project-toolbar">
        <button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="client-detail-filter-button"
        >
          <Filter size={20} />
          Filters
        </button>

        <label className="client-detail-search">
          <Search size={20} />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
          />
        </label>
      </div>

      {filtersOpen && (
        <div className="client-project-filter-panel">
          <p>
            Project filters can be extended here using the same dropdown
            components as the Projects List.
          </p>
        </div>
      )}

      <div className="client-project-table-frame">
        <div className="overflow-x-auto">
          <table className="client-project-table">
            <thead>
              <tr>
                <th>Project Name</th>

                <th>Project Type</th>

                <th>Status</th>

                <th>Open Tickets</th>

                <th>Critical Tickets</th>

                <th>Assigned Team</th>

                <th>Due Date</th>
              </tr>
            </thead>

            <tbody>
              {visible.map((project, index) => (
                <tr
                  key={project.id}
                  className={index % 2 === 1 ? "client-project-row-alt" : ""}
                >
                  <td>
                    <Link
                      href={`/projects/${project.id}`}
                      className="client-project-name"
                    >
                      {project.name}
                    </Link>
                  </td>

                  <td>
                    {typeof project.formData?.projectType === "string"
                      ? project.formData.projectType
                      : "—"}
                  </td>

                  <td>
                    <ProjectStatus status={project.status} size="sm" />
                  </td>

                  <td>{project.openTickets}</td>

                  <td>{project.criticalTickets}</td>

                  <td>
                    <TeamAvatars project={project} />
                  </td>

                  <td>{project.dueDate ? formatDate(project.dueDate) : "—"}</td>
                </tr>
              ))}

              {!visible.length && (
                <tr>
                  <td colSpan={7} className="!h-40 text-center">
                    No projects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="client-detail-pagination">
          <span>
            {projects.length ? start + 1 : 0}
            {" - "}
            {Math.min(start + pageSize, projects.length)}
            {" of "}
            {projects.length}
          </span>

          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));

              setPage(1);
            }}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>

          <div>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              disabled={currentPage >= pageCount}
              onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TEAM
   ========================================================= */

function TeamTab({
  members,
  query,
  setQuery,
}: {
  members: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string | null;
  }>;
  query: string;
  setQuery: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <label className="client-detail-search ml-auto">
        <Search size={20} />

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
        />
      </label>

      <div className="client-team-grid">
        {members.map((member) => (
          <Link
            href={`/resources/${member.id}`}
            key={member.id}
            className="client-team-card"
          >
            <Avatar
              name={member.name}
              src={member.avatar}
              className="size-10"
            />

            <span>
              <strong>{member.name}</strong>

              <small>{member.role}</small>
            </span>
          </Link>
        ))}

        {!members.length && (
          <p className="client-detail-empty-copy">No team members found.</p>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   COMMUNICATION
   ========================================================= */

function CommunicationTab({ client }: { client: ClientEditorRecord }) {
  const form = client.formData;

  return (
    <div className="client-overview">
      <DetailSection title="Primary Communication">
        <DetailGrid>
          <DetailValue
            label="Preferred Contact"
            value={form.preferredContact}
          />

          <DetailValue label="Primary Email" value={form.primaryEmail} />

          <DetailValue label="Primary Phone" value={form.primaryPhone} />

          <DetailValue label="WhatsApp" value={form.whatsappNumber} />

          <DetailValue label="Viber" value={form.viberNumber} />

          <DetailValue
            label="Communication Preference"
            value={form.communicationPreference}
          />
        </DetailGrid>
      </DetailSection>
    </div>
  );
}

/* =========================================================
   ACTIVITY
   ========================================================= */

function ActivityTab({
  projects,
  tickets,
}: {
  projects: Project[];
  tickets: Ticket[];
}) {
  const activity = [
    ...projects.map((project) => ({
      id: `project-${project.id}`,
      title: `Project updated: ${project.name}`,
      date: project.lastUpdated,
      href: `/projects/${project.id}`,
    })),

    ...tickets.map((ticket) => ({
      id: `ticket-${ticket.id}`,
      title: `Ticket: ${ticket.title}`,
      date: ticket.created,
      href: `/tickets/${ticket.id}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="client-activity-list">
      {activity.map((item) => (
        <Link key={item.id} href={item.href}>
          <span>{item.title}</span>

          <time>{item.date ? formatDate(item.date) : "—"}</time>
        </Link>
      ))}

      {!activity.length && (
        <p className="client-detail-empty-copy">No client activity found.</p>
      )}
    </div>
  );
}

/* =========================================================
   SETTINGS
   ========================================================= */

function SettingsTab({
  clientId,
  clientBaseHref,
  allowClientEdit,
}: {
  clientId: string;
  clientBaseHref: string;
  allowClientEdit: boolean;
}) {
  return (
    <div className="client-settings-card">
      <div>
        <h3>Client Settings</h3>

        <p>
          Update client information, communication preferences, team assignments
          and project relationships.
        </p>
      </div>

      {allowClientEdit && (
        <Link
          href={`${clientBaseHref}/${clientId}/edit`}
          className="client-detail-action"
        >
          Edit Client
        </Link>
      )}
    </div>
  );
}

/* =========================================================
   SIMPLE LIST
   ========================================================= */

function SimpleListTab({
  title,
  rows,
  query,
  setQuery,
}: {
  title: string;
  rows: Array<{
    id: string;
    title: string;
    subtitle: string;
    meta: string;
    metaNode?: ReactNode;
    href: string;
  }>;
  query: string;
  setQuery: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="client-detail-section-heading">{title}</h2>

        <label className="client-detail-search">
          <Search size={20} />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
          />
        </label>
      </div>

      <div className="client-record-list">
        {rows.map((row) => (
          <Link href={row.href} key={row.id}>
            <span>
              <strong>{row.title}</strong>

              <small>{row.subtitle}</small>
            </span>

            <span className="client-record-meta">
              {row.metaNode ?? row.meta}
            </span>
          </Link>
        ))}

        {!rows.length && (
          <p className="client-detail-empty-copy">No records found.</p>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   SHARED
   ========================================================= */

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="client-detail-section">
      <h2 className="client-detail-section-heading">{title}</h2>

      {children}
    </section>
  );
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <div className="client-detail-grid">{children}</div>;
}

function DetailValue({
  label,
  value,
  link = false,
  children,
}: {
  label: string;
  value?: string;
  link?: boolean;
  children?: ReactNode;
}) {
  const visible = value?.trim() || "—";

  return (
    <div className="client-detail-value">
      <span>{label}</span>

      {children ? (
        <div>{children}</div>
      ) : link && value ? (
        <a href={value} target="_blank" rel="noreferrer">
          {visible}
        </a>
      ) : (
        <p>{visible}</p>
      )}
    </div>
  );
}

function FilesTab({
  files,
}: {
  files: Array<{
    id: string;
    name: string;
    source: string;
    kind: string;
    url: string;
    uploadedAt: string;
  }>;
}) {
  return (
    <div className="space-y-5">
      <h2 className="client-detail-section-heading">Files</h2>

      <div className="client-record-list">
        {files.map((file) => (
          <a href={file.url} target="_blank" rel="noreferrer" key={file.id}>
            <span>
              <strong>{file.name}</strong>

              <small>
                {file.kind} • {file.source}
              </small>
            </span>

            <span className="client-record-meta">
              {file.uploadedAt ? formatDate(file.uploadedAt) : "—"}
            </span>
          </a>
        ))}

        {!files.length && (
          <p className="client-detail-empty-copy">No files found.</p>
        )}
      </div>
    </div>
  );
}

function normalizeClientStatus(value?: string) {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "inactive":
    case "cancelled":
    case "expired":
      return "Inactive" as const;
    case "paused":
      return "Paused" as const;
    case "completed":
    case "closed":
      return "Completed" as const;
    case "prospect":
    case "negotiation":
    case "onboarding":
      return "Onboarding" as const;
    default:
      return "Active" as const;
  }
}

function ClientLogo({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="client-logo">
      <strong>{initials}</strong>

      <small>CLIENT</small>
    </div>
  );
}

function TeamAvatars({ project }: { project: Project }) {
  const members = project.teamMembers ?? [];

  if (!members.length) {
    return <span className="text-[#98A2B3]">—</span>;
  }

  const shown = members.slice(0, 5);

  return (
    <div className="client-project-team">
      {shown.map((member) => (
        <Avatar
          key={member.id}
          name={member.name}
          src={member.avatar}
          className="size-6"
        />
      ))}

      {members.length > shown.length && (
        <span>+{members.length - shown.length}</span>
      )}
    </div>
  );
}

