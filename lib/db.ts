import "server-only";

import mysql, { type RowDataPacket } from "mysql2/promise";
import type {
  Client,
  Project,
  Ticket,
  TicketAttachment,
  TicketFormData,
  User,
} from "@/types";

const globalDb = globalThis as typeof globalThis & { ticketPool?: mysql.Pool };
const globalSchema = globalThis as typeof globalThis & {
  projectPrioritySetup?: Promise<void>;
  tableChecks?: Map<string, Promise<boolean>>;
};

export const db =
  globalDb.ticketPool ??
  mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT),
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60_000,
    queueLimit: 0,
    enableKeepAlive: true,
    timezone: "Z",
    dateStrings: true,
  });

if (process.env.NODE_ENV !== "production") globalDb.ticketPool = db;

export async function ensureProjectPriorityColumn() {
  if (!globalSchema.projectPrioritySetup) {
    globalSchema.projectPrioritySetup = (async () => {
      const [rows] = await db.query<RowDataPacket[]>(
        `
          SELECT COUNT(*) AS count
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'projects'
            AND COLUMN_NAME = 'priority_type'
        `,
      );

      const count = Number((rows[0] as { count?: number } | undefined)?.count ?? 0);

      if (!count) {
        await db.execute(
          `
            ALTER TABLE projects
            ADD COLUMN priority_type VARCHAR(32) NOT NULL DEFAULT 'Not Assigned'
            AFTER client_id
          `,
        );
      }
    })().catch((error) => {
      globalSchema.projectPrioritySetup = undefined;
      throw error;
    });
  }

  return globalSchema.projectPrioritySetup;
}

async function tableExists(tableName: string) {
  if (!globalSchema.tableChecks) {
    globalSchema.tableChecks = new Map();
  }

  const cached = globalSchema.tableChecks.get(tableName);
  if (cached) {
    return cached;
  }

  const check = (async () => {
    const [rows] = await db.query<RowDataPacket[]>(
      `
        SELECT COUNT(*) AS count
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
      `,
      [tableName],
    );

    return Number((rows[0] as { count?: number } | undefined)?.count ?? 0) > 0;
  })();

  globalSchema.tableChecks.set(tableName, check);

  return check;
}

const json = <T,>(value: string | T | null, fallback: T): T =>
  value == null
    ? fallback
    : typeof value === "string"
      ? (JSON.parse(value) as T)
      : value;

type TicketRow = RowDataPacket & {
  ticket_id: string;
  title: string;
  description: string | null;
  priority_type: string;
  priority_number: number;
  type: string;
  project_name: string | null;
  creator_name: string | null;
  assignee_name: string | null;
  status: string;
  created_date: string | null;
  deadline: string | null;
  form_data: string | Record<string, unknown> | null;
};

type AttachmentRow = RowDataPacket & {
  attachment_id: string;
  ticket_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

const ticketSelect = `
  SELECT t.*, p.name project_name, c.name creator_name, a.name assignee_name
  FROM tickets t
  LEFT JOIN projects p ON p.id = t.project_id
  LEFT JOIN users c ON c.id = t.created_by
  LEFT JOIN users a ON a.id = t.assigned_to
`;

async function listAttachmentsForTickets(ticketIds: string[]) {
  if (!ticketIds.length) return new Map<string, TicketAttachment[]>();
  const placeholders = ticketIds.map(() => "?").join(",");
  const [rows] = await db.query<AttachmentRow[]>(
    `SELECT attachment_id, ticket_id, file_name, mime_type, size_bytes, created_at
     FROM ticket_attachments
     WHERE ticket_id IN (${placeholders})
     ORDER BY created_at ASC`,
    ticketIds,
  );
  const groups = new Map<string, TicketAttachment[]>();
  for (const row of rows) {
    const attachment: TicketAttachment = {
      id: row.attachment_id,
      name: row.file_name,
      mimeType: row.mime_type,
      size: Number(row.size_bytes ?? 0),
      url: `/api/attachments/${row.attachment_id}`,
      uploadedAt: row.created_at,
    };
    const current = groups.get(row.ticket_id) ?? [];
    current.push(attachment);
    groups.set(row.ticket_id, current);
  }
  return groups;
}

const mapTicket = (
  r: TicketRow,
  attachments: TicketAttachment[] = [],
): Ticket => {
  const formData = json<TicketFormData>(r.form_data, {});
  return {
    id: r.ticket_id,
    title: r.title,
    project: r.project_name ?? "",
    status: r.status as Ticket["status"],
    priority:
      ({
        Critical: 1,
        High: 2,
        Medium: 3,
        Low: 4,
        "Not Assigned": 4,
      } as const)[r.priority_type as "Critical"] ?? 4,
    assignedTo: r.assignee_name ?? "",
    reporter: r.creator_name ?? "",
    created: r.created_date ?? "",
    dueDate: r.deadline ?? "",
    description: r.description ?? "",
    tags: Array.isArray(formData.tags)
      ? formData.tags.filter((value): value is string => typeof value === "string")
      : [],
    formData: {
      ...formData,
      attachments,
    },
  };
};

export async function listTickets(lifecycle: "DRAFT" | "OPEN") {
  const [rows] = await db.query<TicketRow[]>(
    `${ticketSelect} WHERE t.lifecycle=? ORDER BY t.updated_at DESC`,
    [lifecycle],
  );
  const attachmentGroups = await listAttachmentsForTickets(
    rows.map((row) => row.ticket_id),
  );
  return rows.map((row) => mapTicket(row, attachmentGroups.get(row.ticket_id) ?? []));
}

export async function findTicket(id: string) {
  const [rows] = await db.query<TicketRow[]>(
    `${ticketSelect} WHERE t.ticket_id=? LIMIT 1`,
    [id],
  );
  if (!rows[0]) return undefined;
  const attachmentGroups = await listAttachmentsForTickets([rows[0].ticket_id]);
  return mapTicket(rows[0], attachmentGroups.get(rows[0].ticket_id) ?? []);
}

type ProjectRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
  client_name: string | null;
  status: Project["status"];
  priority_type: Project["priority"] | null;
  progress: number | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectResourceRow = RowDataPacket & {
  project_id: number;
  user_id: number;
  user_name: string;
  user_role: string;
  avatar: string | null;
};

type ProjectTicketRow = RowDataPacket & {
  project_id: number;
  form_data: string | Record<string, unknown> | null;
  creator_name: string | null;
  assignee_name: string | null;
};

export async function listProjects(): Promise<Project[]> {
  await ensureProjectPriorityColumn();
  const hasProjectResources = await tableExists("project_resources");

  const [projectRows, ticketRows] = await Promise.all([
    db.query<ProjectRow[]>(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.status,
          p.priority_type,
          p.progress,
          p.due_date,
          p.created_at,
          p.updated_at,
          c.company AS client_name
        FROM projects p
        LEFT JOIN clients c
          ON c.id = p.client_id
        ORDER BY p.updated_at DESC
      `,
    ),

    db.query<ProjectTicketRow[]>(
      `
        SELECT
          t.project_id,
          t.form_data,
          c.name AS creator_name,
          a.name AS assignee_name
        FROM tickets t
        LEFT JOIN users c
          ON c.id = t.created_by
        LEFT JOIN users a
          ON a.id = t.assigned_to
        WHERE t.lifecycle = 'OPEN'
          AND t.project_id IS NOT NULL
      `,
    ),
  ]);

  const projects = projectRows[0];
  const tickets = ticketRows[0];

  const resourceMap = new Map<
    number,
    Project["teamMembers"]
  >();

  if (hasProjectResources) {
    const [resourceRows] = await db.query<ProjectResourceRow[]>(
      `
        SELECT
          pr.project_id,
          u.id AS user_id,
          u.name AS user_name,
          u.role AS user_role,
          u.avatar
        FROM project_resources pr
        INNER JOIN users u
          ON u.id = pr.user_id
        ORDER BY pr.created_at ASC
      `,
    );

    for (const resource of resourceRows) {
      const members = resourceMap.get(resource.project_id) ?? [];

      members.push({
        id: String(resource.user_id),
        name: resource.user_name,
        role: resource.user_role
          .replaceAll("_", " ")
          .replace(/\b\w/g, (char) => char.toUpperCase()),
        avatar: resource.avatar,
      });

      resourceMap.set(resource.project_id, members);
    }
  } else {
    for (const ticket of tickets) {
      if (!ticket.project_id) continue;

      const members = resourceMap.get(ticket.project_id) ?? [];
      const seen = new Set(members.map((member) => member.name));

      for (const candidate of [ticket.creator_name, ticket.assignee_name]) {
        if (!candidate || seen.has(candidate)) continue;

        members.push({
          id: `${ticket.project_id}-${candidate}`,
          name: candidate,
          role: "Project Member",
          avatar: null,
        });
        seen.add(candidate);
      }

      resourceMap.set(ticket.project_id, members);
    }
  }

  const ticketCountMap = new Map<
    number,
    {
      open: number;
      critical: number;
    }
  >();

  const priorityMap: Record<string, Project["priority"]> = {
    Critical: "Critical",
    High: "High",
    Medium: "Medium",
    Low: "Low",
    "Not Assigned": "Not Assigned",
  };

  for (const ticket of tickets) {
    const current = ticketCountMap.get(ticket.project_id) ?? {
      open: 0,
      critical: 0,
    };

    current.open += 1;

    let formData: Record<string, unknown> = {};

    try {
      formData =
        typeof ticket.form_data === "string"
          ? JSON.parse(ticket.form_data)
          : ticket.form_data ?? {};
    } catch {
      formData = {};
    }

    const tags = Array.isArray(formData.tags)
      ? formData.tags
          .filter(
            (tag): tag is string =>
              typeof tag === "string",
          )
          .map((tag) => tag.trim().toLowerCase())
      : [];

    if (tags.includes("critical")) {
      current.critical += 1;
    }

    ticketCountMap.set(ticket.project_id, current);
  }

  return projects.map((row): Project => {
    const members = resourceMap.get(row.id) ?? [];
    const ticketCounts = ticketCountMap.get(row.id) ?? {
      open: 0,
      critical: 0,
    };

    return {
      id: String(row.id),
      name: row.name,
      client: row.client_name ?? "Unassigned",
      status: row.status,
      priority: priorityMap[row.priority_type ?? ""] ?? "Not Assigned",

      progress: Number(row.progress ?? 0),
      dueDate: row.due_date ?? "",
      startDate: String(row.created_at).slice(0, 10),
      budget: 0,
      description: row.description ?? "",

      team: members.map((member) => member.name),
      teamMembers: members,

      openTickets: ticketCounts.open,
      criticalTickets: ticketCounts.critical,

      lastUpdated: row.updated_at,
    };
  });
}

export async function findProject(id: string) {
  return (await listProjects()).find(
    (project) => project.id === id,
  );
}

type ClientRow = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  status: "active" | "inactive";
  created_at: string;
  projects: number;
};

export async function listClients() {
  const [rows] = await db.query<ClientRow[]>(
    "SELECT c.*, COUNT(p.id) projects FROM clients c LEFT JOIN projects p ON p.client_id=c.id GROUP BY c.id ORDER BY c.updated_at DESC",
  );
  return rows.map(
    (r): Client => ({
      id: String(r.id),
      name: r.name,
      email: r.email,
      phone: r.phone ?? "",
      company: r.company ?? "",
      projects: Number(r.projects),
      status: r.status === "active" ? "Active" : "Paused",
      joined: String(r.created_at).slice(0, 10),
    }),
  );
}

export async function findClient(id: string) {
  return (await listClients()).find((item) => item.id === id);
}

type UserRow = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
};

export async function listUsers() {
  const [rows] = await db.query<UserRow[]>(
    "SELECT id,name,email,role,avatar FROM users ORDER BY updated_at DESC",
  );

  return rows.map(
    (r): User => ({
      id: String(r.id),
      name: r.name,
      email: r.email,
      phone: "",
      role: r.role
        .replaceAll("_", " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      status: "Active",
      workload: 0,
      skills: [],
      avatar: r.avatar,
    }),
  );
}

export async function findUser(id: string) {
  return (await listUsers()).find((item) => item.id === id);
}
