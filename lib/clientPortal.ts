import "server-only";

import type { RowDataPacket } from "mysql2/promise";

import { db } from "@/lib/db";
import type {
  ClientPortalActivity,
  ClientPortalComment,
  ClientPortalDashboardStats,
  ClientPortalNotification,
  ClientPortalProfile,
  ClientPortalProject,
  ClientPortalProjectFile,
  ClientPortalProjectMember,
  ClientPortalTeamMember,
  ClientPortalTicket,
  ClientPortalTicketAttachment,
  ClientTicketLifecycle,
  ClientTicketStatus,
  ClientTicketType,
} from "@/types/clientPortal";

export type ClientPortalSessionUser = {
  id: number;
  email: string;
  name: string;
  role: string;
};

export type ClientContext = {
  clientId: number;
  clientName: string;
  company: string;
  clientEmail: string;
};

export type ClientTicketAccess = {
  databaseId: number;
  ticketId: string;
  lifecycle: ClientTicketLifecycle;
  createdBy: number | null;
  assignedTo: number | null;
  projectId: number | null;
  projectClientId: number | null;
  status: ClientTicketStatus;
  formData: Record<string, unknown>;
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

function numberArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
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

export async function getClientContext(
  user: Pick<ClientPortalSessionUser, "id" | "email">,
): Promise<ClientContext | null> {
  const [userRows] = await db.query<
    (RowDataPacket & { form_data: string | Record<string, unknown> | null })[]
  >("SELECT form_data FROM users WHERE id = ? LIMIT 1", [user.id]);

  const userData = parseJson<Record<string, unknown>>(userRows[0]?.form_data, {});
  const mappedClientId = Number(userData.clientId ?? userData.client_id ?? 0);

  if (Number.isInteger(mappedClientId) && mappedClientId > 0) {
    const [rows] = await db.query<
      (RowDataPacket & { id: number; name: string; company: string | null; email: string })[]
    >(
      `SELECT id, name, company, email FROM clients WHERE id = ? AND lifecycle = 'OPEN' LIMIT 1`,
      [mappedClientId],
    );
    if (rows[0]) {
      return {
        clientId: rows[0].id,
        clientName: rows[0].name,
        company: rows[0].company || rows[0].name,
        clientEmail: rows[0].email,
      };
    }
  }

  const [direct] = await db.query<
    (RowDataPacket & { id: number; name: string; company: string | null; email: string })[]
  >(
    `
      SELECT id, name, company, email
      FROM clients
      WHERE lifecycle = 'OPEN' AND LOWER(email) = LOWER(?)
      LIMIT 1
    `,
    [user.email],
  );

  if (direct[0]) {
    return {
      clientId: direct[0].id,
      clientName: direct[0].name,
      company: direct[0].company || direct[0].name,
      clientEmail: direct[0].email,
    };
  }

  // Backward-compatible fallback for client records that already keep team members
  // inside clients.form_data but do not yet set users.form_data.clientId.
  const [clients] = await db.query<
    (RowDataPacket & {
      id: number;
      name: string;
      company: string | null;
      email: string;
      form_data: string | Record<string, unknown> | null;
    })[]
  >("SELECT id, name, company, email, form_data FROM clients WHERE lifecycle = 'OPEN'");

  const targetEmail = user.email.trim().toLowerCase();
  for (const client of clients) {
    const data = parseJson<Record<string, unknown>>(client.form_data, {});
    const members = Array.isArray(data.teamMembers) ? data.teamMembers : [];
    if (
      members.some(
        (member) =>
          typeof member === "object" &&
          member !== null &&
          String((member as Record<string, unknown>).email ?? "").trim().toLowerCase() === targetEmail,
      )
    ) {
      return {
        clientId: client.id,
        clientName: client.name,
        company: client.company || client.name,
        clientEmail: client.email,
      };
    }
  }

  return null;
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
  company: string | null;
  client_name: string | null;
  open_tickets: number;
};

async function projectFiles(projectIds: number[]) {
  const map = new Map<number, ClientPortalProjectFile[]>();
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
      url: `/api/client-portal/project-attachments/${row.attachment_id}`,
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
  const map = new Map<string, ClientPortalProjectMember>();
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
  const map = new Map<number, ClientPortalProjectMember[]>();
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
    projectType: String(data.projectType ?? ""),
    department: String(data.department ?? ""),
    moduleName: String(data.moduleName ?? ""),
    subModule: String(data.subModule ?? ""),
    links: {
      staging: typeof links.staging === "string" ? links.staging : undefined,
      live: typeof links.live === "string" ? links.live : undefined,
      figma: typeof links.figma === "string" ? links.figma : undefined,
      github: typeof links.github === "string" ? links.github : undefined,
    },
  };
}


async function clientProjectCriticalCounts(projectIds: number[]) {
  const counts = new Map<number, number>();

  if (!projectIds.length) {
    return counts;
  }

  const placeholders = projectIds.map(() => "?").join(",");

  const [rows] = await db.query<
    (RowDataPacket & {
      project_id: number;
      form_data: string | Record<string, unknown> | null;
    })[]
  >(
    `
      SELECT project_id, form_data
      FROM tickets
      WHERE lifecycle = 'OPEN' AND project_id IN (${placeholders})
    `,
    projectIds,
  );

  for (const row of rows) {
    const data = parseJson<Record<string, unknown>>(row.form_data, {});

    const tags = stringArray(data.tags).map((tag) => tag.trim().toLowerCase());

    if (!tags.includes("critical")) {
      continue;
    }

    counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
  }

  return counts;
}

export async function listClientProjects(user: ClientPortalSessionUser) {
  const context = await getClientContext(user);
  if (!context) return [];

  const [rows] = await db.query<ProjectRow[]>(
    `
      SELECT
        p.id, p.name, p.description, p.status, p.priority_type, p.progress,
        p.due_date, p.updated_at, p.form_data,
        c.company, c.name AS client_name,
        SUM(CASE WHEN t.lifecycle = 'OPEN' AND t.status NOT IN ('Closed','Cancelled') THEN 1 ELSE 0 END) AS open_tickets
      FROM projects p
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN tickets t ON t.project_id = p.id
      WHERE p.lifecycle = 'OPEN' AND p.client_id = ?
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `,
    [context.clientId],
  );

  const projectIds = rows.map((row) => row.id);

  const [
    filesByProject,
    membersById,
    assignedMembers,
    criticalCounts,
  ] = await Promise.all([
    projectFiles(projectIds),
    projectMembers(rows),
    assignedProjectMembers(projectIds),
    clientProjectCriticalCounts(projectIds),
  ]);

  return rows.map((row): ClientPortalProject => {
    const data = parseJson<Record<string, unknown>>(row.form_data, {});
    const safe = safeProjectData(data);
    return {
      id: String(row.id),
      name: row.name,
      description: row.description || "",
      company: row.company || row.client_name || context.company,
      status: row.status || "Active",
      priority: row.priority_type || String(data.priority ?? "Not Assigned"),
      progress: Number(row.progress ?? 0),
      dueDate: row.due_date || "",
      updatedAt: row.updated_at,
      openTickets: Number(row.open_tickets ?? 0),
      criticalTickets: criticalCounts.get(row.id) ?? 0,
      team: Array.from(
        new Map(
          [
            ...stringArray(data.teamIds)
              .map((id) => membersById.get(id))
              .filter((member): member is ClientPortalProjectMember => Boolean(member)),
            ...(assignedMembers.get(row.id) ?? []),
          ].map((member) => [member.id, member]),
        ).values(),
      ),
      files: filesByProject.get(row.id) ?? [],
      ...safe,
    };
  });
}

export async function findClientProject(user: ClientPortalSessionUser, projectId: string) {
  const projects = await listClientProjects(user);
  return projects.find((project) => project.id === projectId);
}

type TicketRow = RowDataPacket & {
  database_id: number;
  ticket_id: string;
  lifecycle: ClientTicketLifecycle;
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
  status: ClientTicketStatus;
  created_at: string;
  updated_at: string;
  deadline: string | null;
  form_data: string | Record<string, unknown> | null;
};

async function ticketAttachments(ticketIds: string[]) {
  const map = new Map<string, ClientPortalTicketAttachment[]>();
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
      url: `/api/client-portal/attachments/${row.attachment_id}`,
    });
    map.set(row.ticket_id, current);
  }
  return map;
}

function mapTicket(row: TicketRow, attachments: ClientPortalTicketAttachment[]): ClientPortalTicket {
  const data = parseJson<Record<string, unknown>>(row.form_data, {});
  return {
    id: row.ticket_id,
    databaseId: row.database_id,
    lifecycle: row.lifecycle,
    title: row.title,
    description: row.description || "",
    type: String(data.type ?? row.type ?? "Task") as ClientTicketType,
    projectId: row.project_id ? String(row.project_id) : null,
    project: row.project_name || "Not selected",
    status: row.status,
    priority: (row.priority_type || "Not Assigned") as ClientPortalTicket["priority"],
    assignee: row.assignee_name || "Unassigned",
    reporter: row.creator_name || "",
    createdById: row.created_by,
    assignedToId: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dueDate: row.deadline || "",
    links: stringArray(data.urls),
    watcherIds: numberArray(data.watchers),
    attachments,
  };
}

export async function listClientTickets(
  user: ClientPortalSessionUser,
  lifecycle: ClientTicketLifecycle,
) {
  const context = await getClientContext(user);
  if (!context) return [];

  const params: unknown[] = [lifecycle];
  const scope =
    lifecycle === "DRAFT"
      ? "t.created_by = ?"
      : "p.client_id = ? AND p.lifecycle = 'OPEN'";
  params.push(lifecycle === "DRAFT" ? user.id : context.clientId);

  const [rows] = await db.query<TicketRow[]>(
    `
      SELECT
        t.id AS database_id, t.ticket_id, t.lifecycle, t.title, t.description,
        t.priority_type, t.type, t.project_id, p.name AS project_name,
        t.created_by, t.assigned_to, creator.name AS creator_name,
        assignee.name AS assignee_name, t.status, t.created_at, t.updated_at,
        t.deadline, t.form_data
      FROM tickets t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN users creator ON creator.id = t.created_by
      LEFT JOIN users assignee ON assignee.id = t.assigned_to
      WHERE t.lifecycle = ? AND (${scope})
      ORDER BY t.updated_at DESC
    `,
    params,
  );

  const attachments = await ticketAttachments(rows.map((row) => row.ticket_id));
  return rows.map((row) => mapTicket(row, attachments.get(row.ticket_id) ?? []));
}

export async function getClientTicketAccess(
  user: ClientPortalSessionUser,
  ticketId: string,
): Promise<ClientTicketAccess | null> {
  const context = await getClientContext(user);
  if (!context) return null;
  const [rows] = await db.query<
    (RowDataPacket & {
      database_id: number;
      ticket_id: string;
      lifecycle: ClientTicketLifecycle;
      created_by: number | null;
      assigned_to: number | null;
      project_id: number | null;
      client_id: number | null;
      project_lifecycle: string | null;
      status: ClientTicketStatus;
      form_data: string | Record<string, unknown> | null;
    })[]
  >(
    `
      SELECT t.id AS database_id, t.ticket_id, t.lifecycle, t.created_by, t.assigned_to,
             t.project_id, p.client_id, p.lifecycle AS project_lifecycle, t.status, t.form_data
      FROM tickets t
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.ticket_id = ?
      LIMIT 1
    `,
    [ticketId],
  );
  const row = rows[0];
  if (!row) return null;
  const allowed =
    (row.lifecycle === "DRAFT" && row.created_by === user.id) ||
    (row.lifecycle === "OPEN" && row.client_id === context.clientId && row.project_lifecycle === "OPEN");
  if (!allowed) return null;
  return {
    databaseId: row.database_id,
    ticketId: row.ticket_id,
    lifecycle: row.lifecycle,
    createdBy: row.created_by,
    assignedTo: row.assigned_to,
    projectId: row.project_id,
    projectClientId: row.client_id,
    status: row.status,
    formData: parseJson<Record<string, unknown>>(row.form_data, {}),
  };
}

async function publicComments(databaseTicketId: number): Promise<ClientPortalComment[]> {
  const visibility = await hasDatabaseColumn("comments", "visibility");
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
      WHERE c.ticket_id = ? ${visibility ? "AND c.visibility = 'PUBLIC'" : ""}
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

async function ticketActivities(databaseTicketId: number): Promise<ClientPortalActivity[]> {
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

export async function findClientTicket(user: ClientPortalSessionUser, ticketId: string) {
  const access = await getClientTicketAccess(user, ticketId);
  if (!access) return undefined;

  const [rows] = await db.query<TicketRow[]>(
    `
      SELECT
        t.id AS database_id, t.ticket_id, t.lifecycle, t.title, t.description,
        t.priority_type, t.type, t.project_id, p.name AS project_name,
        t.created_by, t.assigned_to, creator.name AS creator_name,
        assignee.name AS assignee_name, t.status, t.created_at, t.updated_at,
        t.deadline, t.form_data
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
  const [comments, activities] = await Promise.all([
    publicComments(access.databaseId),
    ticketActivities(access.databaseId),
  ]);
  const ticket = mapTicket(rows[0], attachments.get(ticketId) ?? []);
  const own = access.createdBy === user.id;
  const workNotStarted = ["Open", "Reviewed"].includes(access.status);
  ticket.comments = comments;
  ticket.activities = activities;
  ticket.permissions = {
    canEditDetails: own && workNotStarted,
    canClose: own && !["Closed", "Cancelled"].includes(access.status),
    canReopen: own && ["Closed", "Resolved"].includes(access.status),
    canComment: access.lifecycle === "OPEN",
    canUpload: access.lifecycle === "OPEN",
    canWatch: access.lifecycle === "OPEN",
  };
  return ticket;
}

export async function canClientAccessProjectAttachment(
  user: ClientPortalSessionUser,
  attachmentId: string,
) {
  const context = await getClientContext(user);
  if (!context) return null;
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
      JOIN projects p ON p.id = pa.project_id
      WHERE pa.attachment_id = ? AND p.client_id = ? AND p.lifecycle = 'OPEN'
      LIMIT 1
    `,
    [attachmentId, context.clientId],
  );
  return rows[0] ?? null;
}

export async function canClientAccessTicketAttachment(
  user: ClientPortalSessionUser,
  attachmentId: string,
) {
  const context = await getClientContext(user);
  if (!context) return null;
  const [rows] = await db.query<
    (RowDataPacket & {
      attachment_id: string;
      file_name: string;
      mime_type: string;
      size_bytes: number;
      content: Buffer;
      created_by: number | null;
      lifecycle: ClientTicketLifecycle;
      client_id: number | null;
    })[]
  >(
    `
      SELECT ta.attachment_id, ta.file_name, ta.mime_type, ta.size_bytes, ta.content,
             t.created_by, t.lifecycle, p.client_id
      FROM ticket_attachments ta
      JOIN tickets t ON t.ticket_id = ta.ticket_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE ta.attachment_id = ?
      LIMIT 1
    `,
    [attachmentId],
  );
  const row = rows[0];
  if (!row) return null;
  const allowed =
    (row.lifecycle === "DRAFT" && row.created_by === user.id) ||
    (row.lifecycle === "OPEN" && row.client_id === context.clientId && row.project_lifecycle === "OPEN");
  return allowed ? row : null;
}

export async function addClientActivity(
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

export async function getClientProfile(
  user: ClientPortalSessionUser,
): Promise<ClientPortalProfile> {
  const [rows] = await db.query<
    (RowDataPacket & {
      id: number;
      name: string;
      email: string;
      role: string;
      avatar: string | null;
      form_data: string | Record<string, unknown> | null;
    })[]
  >(
    `
      SELECT
        id,
        name,
        email,
        role,
        avatar,
        form_data
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [user.id],
  );

  const row = rows[0];

  /*
   * A valid client session should normally always have a users row.
   * Still return a complete ClientPortalProfile when a legacy/migrated
   * account temporarily has no matching row so ProfileDetails never
   * receives undefined.
   */
  const sourceName = row?.name?.trim() || user.name.trim();
  const nameParts = sourceName
    ? sourceName.split(/\s+/)
    : [];

  const data = parseJson<Record<string, unknown>>(
    row?.form_data,
    {},
  );

  let context: ClientContext | null = null;

  try {
    context = await getClientContext(user);
  } catch {
    context = null;
  }

  return {
    id: row?.id ?? user.id,
    firstName: String(
      data.firstName ??
        nameParts[0] ??
        "",
    ),
    lastName: String(
      data.lastName ??
        nameParts.slice(1).join(" "),
    ),
    name: sourceName || "Client User",
    email: row?.email || user.email,
    phone: String(data.phone ?? ""),
    jobTitle: String(data.jobTitle ?? ""),
    avatar: String(
      data.avatarUrl ??
        row?.avatar ??
        "",
    ),
    company: context?.company ?? "",
    role: row?.role || user.role,
    emailNotifications:
      data.emailNotifications !== false,
  };
}

export async function listClientTeam(
  user: ClientPortalSessionUser,
): Promise<ClientPortalTeamMember[]> {
  const context = await getClientContext(user);

  if (!context) {
    return [];
  }

  /*
   * Legacy Admin Client records may already contain teamMembers in
   * clients.form_data even when the users row does not yet have clientId.
   * Include those ids/emails so existing client users stay visible/editable.
   */
  const [clientRows] = await db.query<
    (RowDataPacket & {
      form_data: string | Record<string, unknown> | null;
    })[]
  >(
    "SELECT form_data FROM clients WHERE id = ? LIMIT 1",
    [context.clientId],
  );

  const clientData = parseJson<Record<string, unknown>>(
    clientRows[0]?.form_data,
    {},
  );

  const legacyMembers = Array.isArray(clientData.teamMembers)
    ? clientData.teamMembers.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item && typeof item === "object"),
      )
    : [];

  const legacyIds = new Set(
    legacyMembers
      .map((member) => String(member.id ?? "").trim())
      .filter(Boolean),
  );

  const legacyEmails = new Set(
    legacyMembers
      .map((member) =>
        String(member.email ?? "").trim().toLowerCase(),
      )
      .filter(Boolean),
  );

  const [rows] = await db.query<
    (RowDataPacket & {
      id: number;
      name: string;
      email: string;
      avatar: string | null;
      lifecycle: string;
      created_at: string;
      form_data: string | Record<string, unknown> | null;
    })[]
  >(
    `
      SELECT
        id,
        name,
        email,
        avatar,
        lifecycle,
        created_at,
        form_data
      FROM users
      WHERE LOWER(role) IN ('client', 'client_user')
      ORDER BY created_at DESC
    `,
  );

  const clientEmail = context.clientEmail.toLowerCase();

  return rows
    .filter((row) => {
      const data = parseJson<Record<string, unknown>>(
        row.form_data,
        {},
      );

      return (
        Number(data.clientId ?? data.client_id ?? 0) ===
          context.clientId ||
        row.email.toLowerCase() === clientEmail ||
        legacyIds.has(String(row.id)) ||
        legacyEmails.has(row.email.toLowerCase())
      );
    })
    .map((row) => {
      const data = parseJson<Record<string, unknown>>(
        row.form_data,
        {},
      );

      const [fallbackFirst = "", ...fallbackRest] = row.name
        .trim()
        .split(/\s+/);

      const legacyMember = legacyMembers.find(
        (member) =>
          String(member.id ?? "") === String(row.id) ||
          String(member.email ?? "")
            .trim()
            .toLowerCase() === row.email.toLowerCase(),
      );

      return {
        id: String(row.id),
        firstName: String(
          data.firstName ?? fallbackFirst,
        ),
        lastName: String(
          data.lastName ?? fallbackRest.join(" "),
        ),
        name: row.name,
        email: row.email,
        phone: String(
          data.phone ?? legacyMember?.phone ?? "",
        ),
        jobTitle: String(
          data.jobTitle ??
            legacyMember?.role ??
            "",
        ),
        communicationChannel: String(
          data.communicationChannel ??
            legacyMember?.contactChannel ??
            "Email",
        ),
        avatar:
          String(
            data.avatarUrl ??
              row.avatar ??
              legacyMember?.avatar ??
              "",
          ) || null,
        status:
          row.lifecycle === "OPEN"
            ? "Active"
            : "Inactive",
        addedAt: row.created_at,
      };
    });
}

export async function findClientTeamMember(
  user: ClientPortalSessionUser,
  id: string,
): Promise<ClientPortalTeamMember | undefined> {
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return undefined;
  }

  return (await listClientTeam(user)).find(
    (member) => member.id === String(numericId),
  );
}

export async function getClientDashboardStats(
  user: ClientPortalSessionUser,
): Promise<ClientPortalDashboardStats> {
  const [projects, tickets, drafts, team] = await Promise.all([
    listClientProjects(user),
    listClientTickets(user, "OPEN"),
    listClientTickets(user, "DRAFT"),
    listClientTeam(user),
  ]);
  return {
    activeProjects: projects.filter((project) => !["Completed", "Cancelled", "Archived"].includes(project.status)).length,
    openTickets: tickets.filter((ticket) => !["Closed", "Cancelled"].includes(ticket.status)).length,
    drafts: drafts.length,
    teamMembers: team.length,
  };
}

export async function listClientNotifications(
  user: ClientPortalSessionUser,
): Promise<ClientPortalNotification[]> {
  const context = await getClientContext(user);
  if (!context) return [];
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
      SELECT a.id, t.ticket_id, t.title, a.action, a.status, a.created_at
      FROM activities a
      JOIN tickets t ON t.id = a.ticket_id
      JOIN projects p ON p.id = t.project_id
      WHERE p.client_id = ? AND t.lifecycle = 'OPEN'
      ORDER BY a.created_at DESC
      LIMIT 25
    `,
    [context.clientId],
  );
  return rows.map((row) => ({
    id: String(row.id),
    title: row.title,
    body: row.status ? `${row.action} · ${row.status}` : row.action,
    time: row.created_at,
    href: `/client-portal/tickets/${row.ticket_id}`,
  }));
}
