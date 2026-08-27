"use client";

import ProjectDetailsView, {
  type ProjectModuleTicketStat,
} from "@/components/features/ProjectDetailsView";

import { normalizeProjectStatus } from "@/components/features/ProjectStatus";

import type { Project, ProjectPriority, Status, Ticket, User } from "@/types";

import type {
  ClientPortalProject,
  ClientPortalTicket,
} from "@/types/clientPortal";

import type {
  ResourcePortalProject,
  ResourcePortalTicket,
} from "@/types/resourcePortal";

type PortalKind = "client" | "resource";

type PortalProject = ClientPortalProject | ResourcePortalProject;

type PortalTicket = ClientPortalTicket | ResourcePortalTicket;

/* =========================================================
   GENERIC NORMALIZATION
   ========================================================= */

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/*
 * IMPORTANT:
 *
 * This is intentionally Record<string, unknown>,
 * NOT `any`.
 *
 * ClientPortalProject and ResourcePortalProject have
 * slightly different declared shapes.
 *
 * Project fields coming from projects.form_data can
 * therefore be read safely here without TypeScript
 * incorrectly assuming that every union member
 * declares every optional property.
 */
function projectValue(
  project: PortalProject,

  key: string,
): unknown {
  const record = project as unknown as Record<string, unknown>;

  return record[key];
}

function projectText(
  project: PortalProject,

  key: string,
) {
  return cleanText(projectValue(project, key));
}

function normalizePriority(value: string): ProjectPriority {
  switch (value) {
    case "Critical":

    case "High":

    case "Medium":

    case "Low":

    case "Not Assigned":
      return value;

    default:
      return "Not Assigned";
  }
}

function ticketPriority(value: string): Ticket["priority"] {
  switch (value) {
    case "Critical":
      return 1;

    case "High":
      return 2;

    case "Medium":
      return 3;

    case "Low":
      return 4;

    default:
      return 5;
  }
}

function ticketStatus(value: string): Status {
  return (cleanText(value) || "Open") as Status;
}

/* =========================================================
   PROJECT
   ========================================================= */

function projectClientName(project: PortalProject) {
  return "company" in project
    ? cleanText(project.company) || "Unassigned"
    : cleanText(project.client) || "Unassigned";
}

function normalizeUrl(value: unknown) {
  const text = cleanText(value);

  if (!text) {
    return undefined;
  }

  if (/^(https?:\/\/|mailto:|tel:)/i.test(text) || text.startsWith("/")) {
    return text;
  }

  return `https://${text}`;
}

/* =========================================================
   TEAM
   ========================================================= */

function normalizedTeam(project: PortalProject) {
  return Array.from(
    new Map(
      project.team
        .filter((member) => cleanText(member.id) && cleanText(member.name))
        .map(
          (member) =>
            [
              member.id,

              {
                id: cleanText(member.id),

                name: cleanText(member.name),

                role: cleanText(member.role) || "Team Member",

                avatar: member.avatar ?? null,
              },
            ] as const,
        ),
    ).values(),
  );
}

/* =========================================================
   PROJECT TICKET SCOPE
   ========================================================= */

function projectTickets(
  project: PortalProject,

  tickets: PortalTicket[],
) {
  const projectName = cleanText(project.name).toLowerCase();

  return tickets.filter((ticket) => {
    const ticketProjectId = cleanText(ticket.projectId);

    const ticketProjectName = cleanText(ticket.project).toLowerCase();

    return (
      ticketProjectId === project.id ||
      (!ticketProjectId && ticketProjectName === projectName)
    );
  });
}

/* =========================================================
   USERS
   ========================================================= */

function detailUsers(project: PortalProject): User[] {
  const users: User[] = normalizedTeam(project).map((member) => ({
    id: member.id,

    name: member.name,

    role: member.role,

    email: "",

    phone: "",

    status: "Active",

    workload: 0,

    skills: [],

    avatar: member.avatar ?? null,
  }));

  /*
   * These two fields are intentionally read
   * through the safe project boundary.
   *
   * This fixes:
   *
   * Property 'moduleOwnerId' does not exist
   * on type 'PortalProject'.
   */
  const moduleOwnerId = projectText(project, "moduleOwnerId");

  const moduleOwnerName = projectText(project, "moduleOwnerName");

  if (
    moduleOwnerId &&
    moduleOwnerName &&
    !users.some((user) => user.id === moduleOwnerId)
  ) {
    users.push({
      id: moduleOwnerId,

      name: moduleOwnerName,

      role: "Module Owner",

      email: "",

      phone: "",

      status: "Active",

      workload: 0,

      skills: [],

      avatar: null,
    });
  }

  return users;
}

/* =========================================================
   PROJECT -> ADMIN PROJECT MODEL
   ========================================================= */

function detailProject(
  project: PortalProject,

  scopedTickets: PortalTicket[],
): Project {
  const team = normalizedTeam(project);

  const links = project.links ?? {};

  const modules = projectValue(project, "modules");

  const criticalTickets = projectValue(project, "criticalTickets");

  return {
    id: cleanText(project.id),

    lifecycle: "OPEN",

    name: cleanText(project.name) || "Untitled Project",

    client: projectClientName(project),

    status: normalizeProjectStatus(project.status),

    priority: normalizePriority(project.priority),

    progress: Number.isFinite(Number(project.progress))
      ? Math.max(0, Math.min(100, Number(project.progress)))
      : 0,

    dueDate: cleanText(project.dueDate),

    startDate: cleanText(project.startDate),

    budget: 0,

    description: project.description ?? "",

    team: team.map((member) => member.name),

    teamMembers: team,

    /*
     * Portal ticket query already returns
     * OPEN-lifecycle tickets.
     */
    openTickets: scopedTickets.length,

    criticalTickets: Number.isFinite(Number(criticalTickets))
      ? Number(criticalTickets)
      : 0,

    lastUpdated: cleanText(project.updatedAt),

    formData: {
      /*
       * These fields are intentionally read
       * with projectText() so Client/Resource
       * DTO type differences don't cause
       * union-property TypeScript errors.
       */
      projectType: projectText(project, "projectType"),

      department: projectText(project, "department"),

      moduleName: projectText(project, "moduleName"),

      subModule: projectText(project, "subModule"),

      moduleOwnerId: projectText(project, "moduleOwnerId"),

      moduleOwnerName: projectText(project, "moduleOwnerName"),

      modules: Array.isArray(modules) ? modules : [],

      links: {
        staging: normalizeUrl(links.staging),

        live: normalizeUrl(links.live),

        figma: normalizeUrl(links.figma),

        github: normalizeUrl(links.github),
      },

      attachments: Array.isArray(project.files) ? project.files : [],
    },
  };
}

/* =========================================================
   PORTAL TICKET -> ADMIN TICKET MODEL
   ========================================================= */

function detailTickets(
  tickets: PortalTicket[],

  project: PortalProject,
): Ticket[] {
  return tickets.map((ticket) => ({
    id: cleanText(ticket.id),

    createdById: ticket.createdById,

    title: cleanText(ticket.title) || "Untitled Ticket",

    project: cleanText(ticket.project) || cleanText(project.name),

    status: ticketStatus(ticket.status),

    priority: ticketPriority(ticket.priority),

    assignedTo: cleanText(ticket.assignee) || "Unassigned",

    reporter: cleanText(ticket.reporter),

    created: cleanText(ticket.createdAt),

    updatedAt: cleanText(ticket.updatedAt),

    dueDate: cleanText(ticket.dueDate),

    description: ticket.description ?? "",

    tags: [],

    formData: {
      projectId: cleanText(ticket.projectId) || project.id,

      attachments: Array.isArray(ticket.attachments) ? ticket.attachments : [],
    },
  }));
}

/* =========================================================
   SHARED PORTAL VIEW
   ========================================================= */

export default function PortalProjectDetailsView({
  portal,

  project,

  tickets,

  moduleTicketStats = [],
}: {
  portal: PortalKind;

  project: PortalProject;

  tickets: PortalTicket[];

  moduleTicketStats?: ProjectModuleTicketStat[];
}) {
  const scopedTickets = projectTickets(project, tickets);

  const projectBaseHref =
    portal === "client"
      ? "/client-portal/projects"
      : "/resource-portal/projects";

  const ticketBaseHref =
    portal === "client" ? "/client-portal/tickets" : "/resource-portal/tickets";

  return (
    <ProjectDetailsView
      project={detailProject(project, scopedTickets)}
      tickets={detailTickets(scopedTickets, project)}
      users={detailUsers(project)}
      mode={portal}
      projectBaseHref={projectBaseHref}
      ticketBaseHref={ticketBaseHref}
      resourceBaseHref=""
      allowProjectEdit={false}
      allowProjectCreate={false}
      allowTicketCreate
      moduleTicketStats={moduleTicketStats}
    />
  );
}
