import "server-only";

import type { RowDataPacket } from "mysql2/promise";

import { db } from "@/lib/db";
import type {
  ResourcePortalActivity,
  ResourcePortalComment,
  ResourcePortalDashboardStats,
  ResourcePortalNotification,
  ResourcePortalProfile,
  ResourcePortalProject,
  ResourcePortalProjectFile,
  ResourcePortalProjectMember,
  ResourcePortalTicket,
  ResourcePortalTicketAttachment,
  ResourceTicketLifecycle,
  ResourceTicketStatus,
  ResourceTicketType,
} from "@/types/resourcePortal";

export type ResourcePortalSessionUser = {
  id: number;
  email: string;
  name: string;
  role: string;
};

export type ResourceTicketAccess = {
  databaseId: number;
  ticketId: string;
  lifecycle: ResourceTicketLifecycle;
  createdBy: number | null;
  assignedTo: number | null;
  projectId: number | null;
  status: ResourceTicketStatus;
  formData: Record<string, unknown>;
  allowSelfAssign: boolean;
};

function parseJson<T>(value: string | T | null | undefined, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

export async function hasDatabaseColumn(table: string, column: string) {
  const [rows] = await db.query<(RowDataPacket & { count: number })[]>(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [table, column],
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

async function projectFormDataSelect(alias = "p") {
  return (await hasDatabaseColumn("projects", "form_data"))
    ? `${alias}.form_data`
    : "NULL";
}

type ProjectRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
  status: string | null;
  priority_type: string | null;
  progress: number | null;
  due_date: string | null;
  updated_at: string;
  form_data: string | Record<string, unknown> | null;
  client_name: string | null;
  company: string | null;
  open_tickets: number;
};

async function projectFiles(projectIds: number[]) {
  const map = new Map<number, ResourcePortalProjectFile[]>();
  if (!projectIds.length) return map;
  const placeholders = projectIds.map(() => "?").join(",");
  const [rows] = await db.query<
    (RowDataPacket & {
      attachment_id: string;
      project_id: number;
      file_name: string;
      mime_type: string;
      size_bytes: number;
      created_at: string;
    })[]
  >(
    `
      SELECT attachment_id, project_id, file_name, mime_type, size_bytes, created_at
      FROM project_attachments
      WHERE project_id IN (${placeholders})
      ORDER BY created_at DESC
    `,
    projectIds,
  );
  for (const row of rows) {
    const current = map.get(row.project_id) ?? [];
    current.push({
      id: row.attachment_id,
      name: row.file_name,
      mimeType: row.mime_type,
      size: Number(row.size_bytes ?? 0),
      uploadedAt: row.created_at,
      url: `/api/resource-portal/project-attachments/${row.attachment_id}`,
    });
    map.set(row.project_id, current);
  }
  return map;
}

async function projectMembers(rows: ProjectRow[]) {
  const ids = Array.from(
    new Set(
      rows.flatMap((row) => {
        const data = parseJson<Record<string, unknown>>(row.form_data, {});
        return stringArray(data.teamIds);
      }),
    ),
  );
  const map = new Map<string, ResourcePortalProjectMember>();
  if (!ids.length) return map;
  const placeholders = ids.map(() => "?").join(",");
  const [users] = await db.query<
    (RowDataPacket & { id: number; name: string; role: string; avatar: string | null })[]
  >(
    `SELECT id, name, role, avatar FROM users WHERE CAST(id AS CHAR) IN (${placeholders}) AND lifecycle = 'OPEN'`,
    ids,
  );
  for (const user of users) {
    map.set(String(user.id), {
      id: String(user.id),
      name: user.name,
      role: user.role.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      avatar: user.avatar,
    });
  }
  return map;
}

async function assignedProjectMembers(projectIds: number[]) {
  const map = new Map<number, ResourcePortalProjectMember[]>();
  if (!projectIds.length) return map;
  const placeholders = projectIds.map(() => "?").join(",");
  const [rows] = await db.query<
    (RowDataPacket & { project_id: number; id: number; name: string; role: string; avatar: string | null })[]
  >(
    `
      SELECT pr.project_id, u.id, u.name, u.role, u.avatar
      FROM project_resources pr
      JOIN users u ON u.id = pr.user_id
      WHERE pr.project_id IN (${placeholders}) AND u.lifecycle = 'OPEN'
      ORDER BY u.name ASC
    `,
    projectIds,
  );
  for (const row of rows) {
    const current = map.get(row.project_id) ?? [];
    current.push({
      id: String(row.id),
      name: row.name,
      role: row.role.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      avatar: row.avatar,
    });
    map.set(row.project_id, current);
  }
  return map;
}

function safeProjectData(data: Record<string, unknown>) {
  const links =
    typeof data.links === "object" && data.links !== null
      ? (data.links as Record<string, unknown>)
      : {};
  return {
    moduleName: String(data.moduleName ?? ""),
    subModule: String(data.subModule ?? ""),
    links: {
      staging: typeof links.staging === "string" ? links.staging : undefined,
      live: typeof links.live === "string" ? links.live : undefined,
      figma: typeof links.figma === "string" ? links.figma : undefined,
      github: typeof links.github === "string" ? links.github : undefined,
    },
    allowSelfAssign: data.allowResourceSelfAssign === true,
  };
}

export async function listResourceProjects(user: ResourcePortalSessionUser) {
  const formDataSelect = await projectFormDataSelect();
  const [rows] = await db.query<ProjectRow[]>(
    `
      SELECT
        p.id, p.name, p.description, p.status, p.priority_type, p.progress,
        p.due_date, p.updated_at, ${formDataSelect} AS form_data,
        c.name AS client_name, c.company,
        SUM(CASE WHEN t.lifecycle = 'OPEN' AND t.status NOT IN ('Closed','Cancelled') THEN 1 ELSE 0 END) AS open_tickets
      FROM project_resources pr
      JOIN projects p ON p.id = pr.project_id
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN tickets t ON t.project_id = p.id
      WHERE pr.user_id = ? AND p.lifecycle = 'OPEN'
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `,
    [user.id],
  );

  const [filesByProject, membersById, assignedMembers] = await Promise.all([
    projectFiles(rows.map((row) => row.id)),
    projectMembers(rows),
    assignedProjectMembers(rows.map((row) => row.id)),
  ]);

  return rows.map((row): ResourcePortalProject => {
    const data = parseJson<Record<string, unknown>>(row.form_data, {});
    const safe = safeProjectData(data);
    return {
      id: String(row.id),
      name: row.name,
      description: row.description || "",
      client: row.company || row.client_name || "Unassigned",
      status: row.status || "Active",
      priority: row.priority_type || String(data.priority ?? "Not Assigned"),
      progress: Number(row.progress ?? 0),
      dueDate: row.due_date || "",
      updatedAt: row.updated_at,
      openTickets: Number(row.open_tickets ?? 0),
      team: Array.from(
        new Map(
          [
            ...stringArray(data.teamIds)
              .map((id) => membersById.get(id))
              .filter((member): member is ResourcePortalProjectMember => Boolean(member)),
            ...(assignedMembers.get(row.id) ?? []),
          ].map((member) => [member.id, member]),
        ).values(),
      ),
      files: filesByProject.get(row.id) ?? [],
      ...safe,
    };
  });
}

export async function findResourceProject(user: ResourcePortalSessionUser, projectId: string) {
  const projects = await listResourceProjects(user);
  return projects.find((project) => project.id === projectId);
}

export async function resourceHasProject(userId: number, projectId: number | string) {
  const [rows] = await db.query<(RowDataPacket & { project_id: number })[]>(
    `
      SELECT pr.project_id
      FROM project_resources pr
      JOIN projects p ON p.id = pr.project_id
      WHERE pr.user_id = ? AND pr.project_id = ? AND p.lifecycle = 'OPEN'
      LIMIT 1
    `,
    [userId, Number(projectId)],
  );
  return Boolean(rows[0]);
}

type TicketRow = RowDataPacket & {
  database_id: number;
  ticket_id: string;
  lifecycle: ResourceTicketLifecycle;
  title: string;
  description: string | null;
  priority_type: string | null;
  type: string | null;
  project_id: number | null;
  project_name: string | null;
  created_by: number | null;
  assigned_to: number | null;
  creator_name: string | null;
  assignee_name: string | null;
  status: ResourceTicketStatus;
  created_at: string;
  updated_at: string;
  deadline: string | null;
  form_data: string | Record<string, unknown> | null;
  project_form_data: string | Record<string, unknown> | null;
};

async function ticketAttachments(ticketIds: string[]) {
  const map = new Map<string, ResourcePortalTicketAttachment[]>();
  if (!ticketIds.length) return map;
  const placeholders = ticketIds.map(() => "?").join(",");
  const [rows] = await db.query<
    (RowDataPacket & {
      attachment_id: string;
      ticket_id: string;
      file_name: string;
      mime_type: string;
      size_bytes: number;
      created_at: string;
    })[]
  >(
    `
      SELECT attachment_id, ticket_id, file_name, mime_type, size_bytes, created_at
      FROM ticket_attachments
      WHERE ticket_id IN (${placeholders})
      ORDER BY created_at ASC
    `,
    ticketIds,
  );
  for (const row of rows) {
    const current = map.get(row.ticket_id) ?? [];
    current.push({
      id: row.attachment_id,
      name: row.file_name,
      mimeType: row.mime_type,
      size: Number(row.size_bytes ?? 0),
      uploadedAt: row.created_at,
      url: `/api/resource-portal/attachments/${row.attachment_id}`,
    });
    map.set(row.ticket_id, current);
  }
  return map;
}

function mapTicket(row: TicketRow, attachments: ResourcePortalTicketAttachment[]): ResourcePortalTicket {
  const data = parseJson<Record<string, unknown>>(row.form_data, {});
  return {
    id: row.ticket_id,
    databaseId: row.database_id,
    lifecycle: row.lifecycle,
    title: row.title,
    description: row.description || "",
    type: String(data.type ?? row.type ?? "Task") as ResourceTicketType,
    projectId: row.project_id ? String(row.project_id) : null,
    project: row.project_name || "Not selected",
    status: row.status,
    priority: (row.priority_type || "Not Assigned") as ResourcePortalTicket["priority"],
    assignee: row.assignee_name || "Unassigned",
    reporter: row.creator_name || "",
    createdById: row.created_by,
    assignedToId: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dueDate: row.deadline || "",
    links: stringArray(data.urls),
    attachments,
  };
}

export async function listResourceTickets(
  user: ResourcePortalSessionUser,
  lifecycle: ResourceTicketLifecycle,
) {
  const scope = lifecycle === "DRAFT" ? "t.created_by = ?" : "pr.user_id = ?";
  const joins =
    lifecycle === "DRAFT"
      ? "LEFT JOIN project_resources pr ON pr.project_id = t.project_id AND pr.user_id = ?"
      : "JOIN project_resources pr ON pr.project_id = t.project_id";
  const projectFormData = await projectFormDataSelect();


  const [rows] = await db.query<TicketRow[]>(
    `
      SELECT
        t.id AS database_id, t.ticket_id, t.lifecycle, t.title, t.description,
        t.priority_type, t.type, t.project_id, p.name AS project_name,
        t.created_by, t.assigned_to, creator.name AS creator_name,
        assignee.name AS assignee_name, t.status, t.created_at, t.updated_at,
        t.deadline, t.form_data, ${projectFormData} AS project_form_data
      FROM tickets t
      LEFT JOIN projects p ON p.id = t.project_id
      ${joins}
      LEFT JOIN users creator ON creator.id = t.created_by
      LEFT JOIN users assignee ON assignee.id = t.assigned_to
      WHERE t.lifecycle = ? AND (${scope}) ${lifecycle === "OPEN" ? "AND p.lifecycle = 'OPEN'" : ""}
      GROUP BY t.id
      ORDER BY t.updated_at DESC
    `,
    lifecycle === "DRAFT" ? [user.id, lifecycle, user.id] : [lifecycle, user.id],
  );

  const attachments = await ticketAttachments(rows.map((row) => row.ticket_id));
  return rows.map((row) => mapTicket(row, attachments.get(row.ticket_id) ?? []));
}

export async function getResourceTicketAccess(
  user: ResourcePortalSessionUser,
  ticketId: string,
): Promise<ResourceTicketAccess | null> {
  const projectFormData = await projectFormDataSelect();
  const [rows] = await db.query<
    (RowDataPacket & {
      database_id: number;
      ticket_id: string;
      lifecycle: ResourceTicketLifecycle;
      created_by: number | null;
      assigned_to: number | null;
      project_id: number | null;
      status: ResourceTicketStatus;
      form_data: string | Record<string, unknown> | null;
      project_form_data: string | Record<string, unknown> | null;
      assigned_project: number | null;
      project_lifecycle: string | null;
    })[]
  >(
    `
      SELECT t.id AS database_id, t.ticket_id, t.lifecycle, t.created_by, t.assigned_to,
             t.project_id, t.status, t.form_data, ${projectFormData} AS project_form_data,
             pr.project_id AS assigned_project, p.lifecycle AS project_lifecycle
      FROM tickets t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN project_resources pr ON pr.project_id = t.project_id AND pr.user_id = ?
      WHERE t.ticket_id = ?
      LIMIT 1
    `,
    [user.id, ticketId],
  );
  const row = rows[0];
  if (!row) return null;
  const allowed =
    (row.lifecycle === "DRAFT" && row.created_by === user.id) ||
    (row.lifecycle === "OPEN" && Boolean(row.assigned_project) && row.project_lifecycle === "OPEN");
  if (!allowed) return null;
  const projectData = parseJson<Record<string, unknown>>(row.project_form_data, {});
  return {
    databaseId: row.database_id,
    ticketId: row.ticket_id,
    lifecycle: row.lifecycle,
    createdBy: row.created_by,
    assignedTo: row.assigned_to,
    projectId: row.project_id,
    status: row.status,
    formData: parseJson<Record<string, unknown>>(row.form_data, {}),
    allowSelfAssign: projectData.allowResourceSelfAssign === true,
  };
}

async function comments(databaseTicketId: number): Promise<ResourcePortalComment[]> {
  const [rows] = await db.query<
    (RowDataPacket & {
      id: number;
      user_id: number | null;
      content: string;
      created_at: string;
      user_name: string | null;
      avatar: string | null;
    })[]
  >(
    `
      SELECT c.id, c.user_id, c.content, c.created_at, u.name AS user_name, u.avatar
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.ticket_id = ?
      ORDER BY c.created_at ASC
    `,
    [databaseTicketId],
  );
  return rows.map((row) => ({
    id: String(row.id),
    userId: row.user_id,
    user: row.user_name || "Support",
    avatar: row.avatar,
    content: row.content,
    createdAt: row.created_at,
  }));
}

async function ticketActivities(databaseTicketId: number): Promise<ResourcePortalActivity[]> {
  const [rows] = await db.query<
    (RowDataPacket & {
      id: number;
      action: string;
      status: string | null;
      created_at: string;
      user_name: string | null;
    })[]
  >(
    `
      SELECT a.id, a.action, a.status, a.created_at, u.name AS user_name
      FROM activities a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.ticket_id = ?
      ORDER BY a.created_at DESC
      LIMIT 50
    `,
    [databaseTicketId],
  );
  return rows.map((row) => ({
    id: String(row.id),
    action: row.action,
    status: row.status,
    user: row.user_name || "System",
    createdAt: row.created_at,
  }));
}

export async function findResourceTicket(user: ResourcePortalSessionUser, ticketId: string) {
  const access = await getResourceTicketAccess(user, ticketId);
  if (!access) return undefined;
  const projectFormData = await projectFormDataSelect();
  const [rows] = await db.query<TicketRow[]>(
    `
      SELECT
        t.id AS database_id, t.ticket_id, t.lifecycle, t.title, t.description,
        t.priority_type, t.type, t.project_id, p.name AS project_name,
        t.created_by, t.assigned_to, creator.name AS creator_name,
        assignee.name AS assignee_name, t.status, t.created_at, t.updated_at,
        t.deadline, t.form_data, ${projectFormData} AS project_form_data
      FROM tickets t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN users creator ON creator.id = t.created_by
      LEFT JOIN users assignee ON assignee.id = t.assigned_to
      WHERE t.ticket_id = ?
      LIMIT 1
    `,
    [ticketId],
  );
  if (!rows[0]) return undefined;
  const attachments = await ticketAttachments([ticketId]);
  const [ticketComments, activities] = await Promise.all([
    comments(access.databaseId),
    ticketActivities(access.databaseId),
  ]);
  const ticket = mapTicket(rows[0], attachments.get(ticketId) ?? []);
  const ownsOrAssigned = access.createdBy === user.id || access.assignedTo === user.id;
  ticket.comments = ticketComments;
  ticket.activities = activities;
  ticket.permissions = {
    canEditDetails: ownsOrAssigned,
    canChangeStatus: ownsOrAssigned,
    canSelfAssign: access.allowSelfAssign && access.assignedTo == null,
    canComment: access.lifecycle === "OPEN",
    canUpload: access.lifecycle === "OPEN",
    canAddLink: access.lifecycle === "OPEN",
  };
  return ticket;
}

export async function canResourceAccessProjectAttachment(
  user: ResourcePortalSessionUser,
  attachmentId: string,
) {
  const [rows] = await db.query<
    (RowDataPacket & {
      attachment_id: string;
      file_name: string;
      mime_type: string;
      size_bytes: number;
      file_data: Buffer;
    })[]
  >(
    `
      SELECT pa.attachment_id, pa.file_name, pa.mime_type, pa.size_bytes, pa.file_data
      FROM project_attachments pa
      JOIN project_resources pr ON pr.project_id = pa.project_id
      JOIN projects p ON p.id = pa.project_id
      WHERE pa.attachment_id = ? AND pr.user_id = ? AND p.lifecycle = 'OPEN'
      LIMIT 1
    `,
    [attachmentId, user.id],
  );
  return rows[0] ?? null;
}

export async function canResourceAccessTicketAttachment(
  user: ResourcePortalSessionUser,
  attachmentId: string,
) {
  const [rows] = await db.query<
    (RowDataPacket & {
      attachment_id: string;
      file_name: string;
      mime_type: string;
      size_bytes: number;
      content: Buffer;
      created_by: number | null;
      lifecycle: ResourceTicketLifecycle;
      assigned_project: number | null;
      project_lifecycle: string | null;
    })[]
  >(
    `
      SELECT ta.attachment_id, ta.file_name, ta.mime_type, ta.size_bytes, ta.content,
             t.created_by, t.lifecycle, pr.project_id AS assigned_project,
             p.lifecycle AS project_lifecycle
      FROM ticket_attachments ta
      JOIN tickets t ON t.ticket_id = ta.ticket_id
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN project_resources pr ON pr.project_id = t.project_id AND pr.user_id = ?
      WHERE ta.attachment_id = ?
      LIMIT 1
    `,
    [user.id, attachmentId],
  );
  const row = rows[0];
  if (!row) return null;
  const allowed =
    (row.lifecycle === "DRAFT" && row.created_by === user.id) ||
    (row.lifecycle === "OPEN" && Boolean(row.assigned_project) && row.project_lifecycle === "OPEN");
  return allowed ? row : null;
}

export async function addResourceActivity(
  databaseTicketId: number,
  userId: number,
  action: string,
  status?: string | null,
) {
  await db.execute(
    "INSERT INTO activities (ticket_id, user_id, action, status) VALUES (?, ?, ?, ?)",
    [databaseTicketId, userId, action, status ?? null],
  );
}

export async function getResourceProfile(
  user: ResourcePortalSessionUser,
): Promise<ResourcePortalProfile> {
  const [rows] = await db.query<
    (RowDataPacket & {
      id: number;
      name: string;
      email: string;
      role: string;
      avatar: string | null;
      form_data: string | Record<string, unknown> | null;
    })[]
  >("SELECT id, name, email, role, avatar, form_data FROM users WHERE id = ? LIMIT 1", [user.id]);
  const row = rows[0];
  if (!row) throw new Error("Profile not found");
  const data = parseJson<Record<string, unknown>>(row.form_data, {});
  const parts = row.name.trim().split(/\s+/);
  return {
    id: row.id,
    firstName: String(data.firstName ?? parts[0] ?? ""),
    lastName: String(data.lastName ?? parts.slice(1).join(" ")),
    name: row.name,
    email: row.email,
    phone: String(data.phone ?? ""),
    jobTitle: String(data.jobTitle ?? row.role.replaceAll("_", " ")),
    avatar: String(data.avatarUrl ?? row.avatar ?? ""),
    role: row.role,
    emailNotifications: data.emailNotifications !== false,
  };
}

export async function getResourceDashboardStats(
  user: ResourcePortalSessionUser,
): Promise<ResourcePortalDashboardStats> {
  const [projects, tickets, drafts] = await Promise.all([
    listResourceProjects(user),
    listResourceTickets(user, "OPEN"),
    listResourceTickets(user, "DRAFT"),
  ]);
  return {
    assignedProjects: projects.length,
    openTickets: tickets.filter((ticket) => !["Closed", "Cancelled"].includes(ticket.status)).length,
    assignedTickets: tickets.filter((ticket) => ticket.assignedToId === user.id).length,
    drafts: drafts.length,
  };
}

export async function listResourceNotifications(
  user: ResourcePortalSessionUser,
): Promise<ResourcePortalNotification[]> {
  const [rows] = await db.query<
    (RowDataPacket & {
      id: number;
      ticket_id: string;
      title: string;
      action: string;
      status: string | null;
      created_at: string;
    })[]
  >(
    `
      SELECT DISTINCT a.id, t.ticket_id, t.title, a.action, a.status, a.created_at
      FROM activities a
      JOIN tickets t ON t.id = a.ticket_id
      JOIN project_resources pr ON pr.project_id = t.project_id
      WHERE pr.user_id = ? AND t.lifecycle = 'OPEN'
      ORDER BY a.created_at DESC
      LIMIT 25
    `,
    [user.id],
  );
  return rows.map((row) => ({
    id: String(row.id),
    title: row.title,
    body: row.status ? `${row.action} · ${row.status}` : row.action,
    time: row.created_at,
    href: `/resource/tickets/${row.ticket_id}`,
  }));
}
