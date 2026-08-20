import "server-only";

import mysql, { type RowDataPacket } from "mysql2/promise";

import type {
  Client,
  ClientDraftRow,
  ClientEditorRecord,
  ClientFormData,
  ClientLifecycle,
  ClientListRow,
  ClientListStatus,
  Project,
  ProjectFormData,
  ProjectTeamMember,
  ResourceListRow,
  Ticket,
  TicketAttachment,
  TicketFormData,
  User,
  RoleFormRecord,
  RoleRecord,
  RoleType,
} from "@/types";

/* =========================================================
   DATABASE
   ========================================================= */

const globalDb = globalThis as typeof globalThis & {
  ticketPool?: mysql.Pool;
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

if (process.env.NODE_ENV !== "production") {
  globalDb.ticketPool = db;
}

/* =========================================================
   GENERIC HELPERS
   ========================================================= */

function json<T>(value: string | T | null, fallback: T): T {
  if (value == null) {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/* =========================================================
   TICKETS
   ========================================================= */

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

  form_data: string | TicketFormData | null;
};

type TicketAttachmentRow = RowDataPacket & {
  attachment_id: string;

  ticket_id: string;

  file_name: string;

  mime_type: string;

  size_bytes: number;

  created_at: string;
};

const ticketSelect = `
  SELECT
    t.*,
    p.name AS project_name,
    c.name AS creator_name,
    a.name AS assignee_name

  FROM tickets t

  LEFT JOIN projects p
    ON p.id = t.project_id

  LEFT JOIN users c
    ON c.id = t.created_by

  LEFT JOIN users a
    ON a.id = t.assigned_to
`;

async function listAttachmentsForTickets(ticketIds: string[]) {
  const groups = new Map<string, TicketAttachment[]>();

  if (ticketIds.length === 0) {
    return groups;
  }

  const placeholders = ticketIds.map(() => "?").join(",");

  const [rows] = await db.query<TicketAttachmentRow[]>(
    `
        SELECT
          attachment_id,
          ticket_id,
          file_name,
          mime_type,
          size_bytes,
          created_at

        FROM ticket_attachments

        WHERE ticket_id IN (
          ${placeholders}
        )

        ORDER BY
          created_at ASC
      `,
    ticketIds,
  );

  for (const row of rows) {
    const current = groups.get(row.ticket_id) ?? [];

    current.push({
      id: row.attachment_id,

      name: row.file_name,

      mimeType: row.mime_type,

      size: Number(row.size_bytes ?? 0),

      url: `/api/attachments/${row.attachment_id}`,

      uploadedAt: row.created_at,
    });

    groups.set(row.ticket_id, current);
  }

  return groups;
}

function mapTicket(
  row: TicketRow,
  attachments: TicketAttachment[] = [],
): Ticket {
  const formData = json<TicketFormData>(row.form_data, {});

  const priority =
    (
      {
        Critical: 1,

        High: 2,

        Medium: 3,

        Low: 4,

        "Not Assigned": 5,
      } as const
    )[
      row.priority_type as
        | "Critical"
        | "High"
        | "Medium"
        | "Low"
        | "Not Assigned"
    ] ?? 5;

  return {
    id: row.ticket_id,

    title: row.title,

    project: row.project_name ?? "",

    status: row.status as Ticket["status"],

    priority,

    assignedTo: row.assignee_name ?? "",

    reporter: row.creator_name ?? "",

    created: row.created_date ?? "",

    dueDate: row.deadline ?? "",

    description: row.description ?? "",

    tags: Array.isArray(formData.tags)
      ? formData.tags.filter(
          (value): value is string => typeof value === "string",
        )
      : [],

    formData: {
      ...formData,
      attachments,
    },
  };
}

export async function listTickets(lifecycle: "DRAFT" | "OPEN") {
  const [rows] = await db.query<TicketRow[]>(
    `
        ${ticketSelect}

        WHERE
          t.lifecycle = ?

        ORDER BY
          t.updated_at DESC
      `,
    [lifecycle],
  );

  const groups = await listAttachmentsForTickets(
    rows.map((row) => row.ticket_id),
  );

  return rows.map((row) => mapTicket(row, groups.get(row.ticket_id) ?? []));
}

export async function findTicket(id: string) {
  const [rows] = await db.query<TicketRow[]>(
    `
        ${ticketSelect}

        WHERE
          t.ticket_id = ?

        LIMIT 1
      `,
    [id],
  );

  const row = rows[0];

  if (!row) {
    return undefined;
  }

  const groups = await listAttachmentsForTickets([row.ticket_id]);

  return mapTicket(row, groups.get(row.ticket_id) ?? []);
}

/* =========================================================
   PROJECTS
   ========================================================= */

type ProjectRow = RowDataPacket & {
  id: number;

  lifecycle: "DRAFT" | "OPEN";

  name: string;

  description: string | null;

  client_id: number | null;

  client_name: string | null;

  status: Project["status"];

  priority_type?: Project["priority"] | null;

  progress: number | null;

  due_date: string | null;

  start_date: string | null;

  created_at: string;

  updated_at: string;

  form_data: string | ProjectFormData | null;
};

type ProjectAttachmentRow = RowDataPacket & {
  attachment_id: string;

  project_id: number;

  file_name: string;

  mime_type: string;

  size_bytes: number;

  created_at: string;
};

async function listProjectAttachments(projectIds: number[]) {
  const groups = new Map<number, TicketAttachment[]>();

  if (projectIds.length === 0) {
    return groups;
  }

  const placeholders = projectIds.map(() => "?").join(",");

  const [rows] = await db.query<ProjectAttachmentRow[]>(
    `
        SELECT
          attachment_id,
          project_id,
          file_name,
          mime_type,
          size_bytes,
          created_at

        FROM project_attachments

        WHERE project_id IN (
          ${placeholders}
        )

        ORDER BY
          created_at ASC
      `,
    projectIds,
  );

  for (const row of rows) {
    const current = groups.get(row.project_id) ?? [];

    current.push({
      id: row.attachment_id,

      name: row.file_name,

      mimeType: row.mime_type,

      size: Number(row.size_bytes ?? 0),

      url: `/api/project-attachments/${row.attachment_id}`,

      uploadedAt: row.created_at,
    });

    groups.set(row.project_id, current);
  }

  return groups;
}

async function projectTicketCounts(projectIds: number[]) {
  const result = new Map<
    number,
    {
      open: number;

      critical: number;
    }
  >();

  if (projectIds.length === 0) {
    return result;
  }

  const placeholders = projectIds.map(() => "?").join(",");

  const [rows] = await db.query<
    (RowDataPacket & {
      project_id: number;

      form_data: string | Record<string, unknown> | null;
    })[]
  >(
    `
        SELECT
          project_id,
          form_data

        FROM tickets

        WHERE
          lifecycle = 'OPEN'

          AND project_id IN (
            ${placeholders}
          )
      `,
    projectIds,
  );

  for (const row of rows) {
    const current = result.get(row.project_id) ?? {
      open: 0,

      critical: 0,
    };

    current.open += 1;

    const data = json<Record<string, unknown>>(row.form_data, {});

    const tags = Array.isArray(data.tags)
      ? data.tags
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim().toLowerCase())
      : [];

    if (tags.includes("critical")) {
      current.critical += 1;
    }

    result.set(row.project_id, current);
  }

  return result;
}

export async function listProjects(
  lifecycle: "DRAFT" | "OPEN" | "ALL" = "OPEN",
) {
  const where = lifecycle === "ALL" ? "" : "WHERE p.lifecycle = ?";

  const params = lifecycle === "ALL" ? [] : [lifecycle];

  const [rows] = await db.query<ProjectRow[]>(
    `
        SELECT
          p.*,
          c.company AS client_name

        FROM projects p

        LEFT JOIN clients c
          ON c.id = p.client_id

        ${where}

        ORDER BY
          p.updated_at DESC
      `,
    params,
  );

  const projectIds = rows.map((row) => row.id);

  const [attachmentGroups, ticketCounts] = await Promise.all([
    listProjectAttachments(projectIds),

    projectTicketCounts(projectIds),
  ]);

  const teamIds = Array.from(
    new Set(
      rows.flatMap((row) => {
        const formData = json<ProjectFormData>(row.form_data, {});

        if (!Array.isArray(formData.teamIds)) {
          return [];
        }

        return formData.teamIds.filter(
          (value): value is string => typeof value === "string",
        );
      }),
    ),
  );

  const teamMembersById = new Map<string, ProjectTeamMember>();

  if (teamIds.length > 0) {
    const placeholders = teamIds.map(() => "?").join(",");

    const [userRows] = await db.query<
      (RowDataPacket & {
        id: number;

        name: string;

        role: string;

        avatar: string | null;
      })[]
    >(
      `
          SELECT
            id,
            name,
            role,
            avatar

          FROM users

          WHERE CAST(
            id AS CHAR
          ) IN (
            ${placeholders}
          )
        `,
      teamIds,
    );

    for (const row of userRows) {
      teamMembersById.set(String(row.id), {
        id: String(row.id),

        name: row.name,

        role: row.role
          .replaceAll("_", " ")
          .replace(/\b\w/g, (character) => character.toUpperCase()),

        avatar: row.avatar,
      });
    }
  }

  return rows.map((row): Project => {
    const formData = json<ProjectFormData>(row.form_data, {});

    const priority =
      row.priority_type ??
      (typeof formData.priority === "string"
        ? (formData.priority as Project["priority"])
        : "Not Assigned");

    const members = Array.isArray(formData.teamIds)
      ? formData.teamIds
          .map((memberId) => teamMembersById.get(memberId))
          .filter((member): member is ProjectTeamMember => Boolean(member))
      : [];

    const counts = ticketCounts.get(row.id) ?? {
      open: 0,

      critical: 0,
    };

    return {
      id: String(row.id),

      lifecycle: row.lifecycle ?? "OPEN",

      name: row.name,

      client: row.client_name ?? "Unassigned",

      clientId: row.client_id ? String(row.client_id) : undefined,

      status: row.status,

      priority,

      progress: Number(row.progress ?? 0),

      dueDate: row.due_date ?? "",

      startDate: row.start_date ?? String(row.created_at).slice(0, 10),

      budget: 0,

      description: row.description ?? "",

      team: members.map((member) => member.name),

      teamMembers: members,

      openTickets: counts.open,

      criticalTickets: counts.critical,

      lastUpdated: row.updated_at ?? row.created_at,

      formData: {
        ...formData,

        attachments: attachmentGroups.get(row.id) ?? [],
      },
    };
  });
}

export async function findProject(id: string) {
  return (await listProjects("ALL")).find((item) => item.id === id);
}

/* =========================================================
   PROJECT PRIORITY COLUMN CHECK
   ========================================================= */

let projectPriorityColumnCache: boolean | null = null;

export async function hasProjectPriorityColumn() {
  if (projectPriorityColumnCache !== null) {
    return projectPriorityColumnCache;
  }

  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `
          SELECT
            COUNT(*) AS count

          FROM information_schema.COLUMNS

          WHERE
            TABLE_SCHEMA = DATABASE()

            AND TABLE_NAME = 'projects'

            AND COLUMN_NAME = 'priority_type'
        `,
    );

    projectPriorityColumnCache = Number(rows[0]?.count ?? 0) > 0;
  } catch {
    projectPriorityColumnCache = false;
  }

  return projectPriorityColumnCache;
}

/* =========================================================
   CLIENT HELPERS
   ========================================================= */

export const emptyClientForm: ClientFormData = {
  clientName: "",

  clientType: "",

  clientSource: "",

  industry: "",

  website: "",

  clientStatus: "",

  primaryContactName: "",

  primaryJobTitle: "",

  primaryEmail: "",

  primaryPhone: "",

  preferredContact: "",

  upworkProfileName: "",

  upworkProfileUrl: "",

  upworkContractId: "",

  upworkPhone: "",

  contractType: "",

  budgetRate: "",

  contractStatus: "",

  teamMembers: [],

  whatsappNumber: "",

  viberNumber: "",

  communicationPreference: "",

  projectIds: [],

  accountManagerId: "",

  coordinatorId: "",

  integrationType: "",

  apiBaseUrl: "",

  webhookUrl: "",

  apiKey: "",

  internalNotes: "",
};

function parseClientFormData(
  value: string | ClientFormData | null,
): ClientFormData {
  if (!value) {
    return {
      ...emptyClientForm,

      teamMembers: [],

      projectIds: [],
    };
  }

  let parsed: Partial<ClientFormData> | undefined;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as Partial<ClientFormData>;
    } catch {
      parsed = {};
    }
  } else {
    parsed = value;
  }

  return {
    ...emptyClientForm,
    ...parsed,

    teamMembers: Array.isArray(parsed.teamMembers) ? parsed.teamMembers : [],

    projectIds: Array.isArray(parsed.projectIds) ? parsed.projectIds : [],
  };
}

/* =========================================================
   BASIC CLIENTS
   ========================================================= */

type ClientRow = RowDataPacket & {
  id: number;

  name: string;

  email: string;

  phone: string | null;

  company: string | null;

  status: "active" | "inactive";

  lifecycle: ClientLifecycle;

  created_at: string;

  projects: number;
};

export async function listClients() {
  const [rows] = await db.query<ClientRow[]>(
    `
        SELECT
          c.*,
          COUNT(p.id) AS projects

        FROM clients c

        LEFT JOIN projects p
          ON p.client_id = c.id
          AND p.lifecycle = 'OPEN'

        WHERE
          c.lifecycle = 'OPEN'

        GROUP BY
          c.id

        ORDER BY
          c.updated_at DESC
      `,
  );

  return rows.map(
    (row): Client => ({
      id: String(row.id),

      name: row.name,

      email: row.email,

      phone: row.phone ?? "",

      company: row.company ?? "",

      projects: Number(row.projects ?? 0),

      status: row.status === "active" ? "Active" : "Paused",

      joined: String(row.created_at).slice(0, 10),
    }),
  );
}

export async function findClient(id: string) {
  return (await listClients()).find((item) => item.id === id);
}

/* =========================================================
   CLIENT EDIT / DRAFT RECORDS
   ========================================================= */

type ClientRecordRow = RowDataPacket & {
  id: number;

  name: string;

  email: string;

  phone: string | null;

  company: string | null;

  status: "active" | "inactive";

  lifecycle: ClientLifecycle;

  form_data: string | ClientFormData | null;

  created_at: string;

  updated_at: string;
};

export async function findClientRecord(
  id: string,
): Promise<ClientEditorRecord | undefined> {
  const clientId = Number(id);

  if (!Number.isInteger(clientId) || clientId <= 0) {
    return undefined;
  }

  const [rows] = await db.query<ClientRecordRow[]>(
    `
        SELECT
          id,
          name,
          email,
          phone,
          company,
          status,
          lifecycle,
          form_data,
          created_at,
          updated_at

        FROM clients

        WHERE id = ?

        LIMIT 1
      `,
    [clientId],
  );

  const row = rows[0];

  if (!row) {
    return undefined;
  }

  const formData = parseClientFormData(row.form_data);

  /*
   * Support legacy clients that were
   * created before form_data existed.
   */
  if (!formData.clientName) {
    formData.clientName = row.company?.trim() || row.name;
  }

  if (!formData.primaryContactName) {
    formData.primaryContactName = row.name;
  }

  if (!formData.primaryEmail && !row.email.endsWith("@draft.local")) {
    formData.primaryEmail = row.email;
  }

  if (!formData.primaryPhone) {
    formData.primaryPhone = row.phone ?? "";
  }

  if (!formData.clientStatus) {
    formData.clientStatus = row.status === "active" ? "Active" : "Inactive";
  }

  return {
    id: String(row.id),

    lifecycle: row.lifecycle,

    formData,

    updatedAt: row.updated_at,
  };
}

export async function listClientDraftRows(): Promise<ClientDraftRow[]> {
  const [rows] = await db.query<ClientRecordRow[]>(
    `
        SELECT
          id,
          name,
          email,
          phone,
          company,
          status,
          lifecycle,
          form_data,
          created_at,
          updated_at

        FROM clients

        WHERE
          lifecycle = 'DRAFT'

        ORDER BY
          updated_at DESC,
          id DESC
      `,
  );

  return rows.map((row): ClientDraftRow => {
    const form = parseClientFormData(row.form_data);

    return {
      id: String(row.id),

      clientName:
        form.clientName.trim() ||
        row.company?.trim() ||
        row.name ||
        "Untitled Client",

      primaryContact: form.primaryContactName.trim() || row.name || "-",

      clientType: form.clientType || "-",

      clientSource: form.clientSource || "-",

      status: form.clientStatus || "Draft",

      updatedAt: row.updated_at,
    };
  });
}

/* =========================================================
   USERS
   ========================================================= */

type UserRow = RowDataPacket & {
  id: number;

  name: string;

  email: string;

  role: string;

  avatar: string | null;
};

export async function listUsers() {
  const [rows] = await db.query<UserRow[]>(
    `
        SELECT
          id,
          name,
          email,
          role,
          avatar

        FROM users

        WHERE
          lifecycle = 'OPEN'

        ORDER BY
          updated_at DESC
      `,
  );

  return rows.map(
    (row): User => ({
      id: String(row.id),

      name: row.name,

      email: row.email,

      phone: "",

      role: formatResourceRole(row.role),

      avatar: row.avatar,

      status: "Active",

      workload: 0,

      skills: [],
    }),
  );
}

export async function findUser(id: string) {
  return (await listUsers()).find((item) => item.id === id);
}

/* =========================================================
   RESOURCES
   ========================================================= */

type ResourceLifecycle = "OPEN" | "DRAFT";

type ResourceListDbRow = RowDataPacket & {
  id: number;

  name: string;

  email: string;

  role: string;

  avatar: string | null;

  lifecycle: ResourceLifecycle;

  form_data: string | Record<string, unknown> | null;

  assigned_projects: number;

  active_tickets: number;
};

type ResourceStoredForm = {
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
};

function parseResourceFormData(
  value: string | Record<string, unknown> | null,
): ResourceStoredForm {
  if (!value) {
    return {};
  }

  if (typeof value === "object") {
    return value as ResourceStoredForm;
  }

  try {
    const parsed = JSON.parse(value);

    if (parsed && typeof parsed === "object") {
      return parsed as ResourceStoredForm;
    }
  } catch {
    // Legacy/invalid JSON.
  }

  return {};
}

export async function listResourceRows(
  lifecycle: ResourceLifecycle = "OPEN",
): Promise<ResourceListRow[]> {
  const [rows] = await db.query<ResourceListDbRow[]>(
    `
        SELECT
          u.id,
          u.name,
          u.email,
          u.role,
          u.avatar,
          u.lifecycle,
          u.form_data,

          (
            SELECT
              COUNT(
                DISTINCT
                pr.project_id
              )

            FROM project_resources pr

            WHERE
              pr.user_id = u.id
          ) AS assigned_projects,

          (
            SELECT
              COUNT(
                DISTINCT
                t.ticket_id
              )

            FROM tickets t

            WHERE
              t.assigned_to = u.id

              AND t.lifecycle = 'OPEN'

              AND LOWER(
                COALESCE(
                  t.status,
                  ''
                )
              ) <> 'closed'
          ) AS active_tickets

        FROM users u

        WHERE
          u.lifecycle = ?

        ORDER BY
          u.updated_at DESC,
          u.id DESC
      `,
    [lifecycle],
  );

  return rows.map((row): ResourceListRow => {
    const form = parseResourceFormData(row.form_data);

    const storedName = [form.firstName, form.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    const skills = Array.isArray(form.skills)
      ? form.skills.filter(
          (skill): skill is string => typeof skill === "string",
        )
      : [];

    return {
      id: String(row.id),

      name: storedName || row.name || "Untitled Resource",

      avatar: row.avatar,

      jobTitle: form.jobTitle || formatResourceRole(row.role),

      team: form.team || form.department || "-",

      skills,

      assignedProjects: Number(row.assigned_projects ?? 0),

      activeTickets: Number(row.active_tickets ?? 0),

      reportingTo: form.reportingTo || "-",

      status: row.lifecycle === "OPEN" ? "Active" : "Inactive",
    };
  });
}

function formatResourceRole(role: string) {
  return String(role ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/* =========================================================
   RESOURCE LOOKUP / DRAFT EDITING
   ========================================================= */

type ResourceRecordRow = RowDataPacket & {
  id: number;

  lifecycle: ResourceLifecycle;

  name: string;

  email: string;

  role: string;

  avatar: string | null;

  form_data: string | Record<string, unknown> | null;
};

export async function findResource(id: string) {
  const [rows] = await db.query<ResourceRecordRow[]>(
    `
        SELECT
          id,
          lifecycle,
          name,
          email,
          role,
          avatar,
          form_data

        FROM users

        WHERE
          id = ?

        LIMIT 1
      `,
    [id],
  );

  const row = rows[0];

  if (!row) {
    return undefined;
  }

  return {
    id: String(row.id),

    lifecycle: row.lifecycle,

    name: row.name,

    email: row.email,

    role: row.role,

    avatar: row.avatar,

    formData: parseResourceFormData(row.form_data),
  };
}

/* =========================================================
   CLIENT LIST
   ========================================================= */

type ClientListBaseRow = RowDataPacket & {
  id: number;

  name: string;

  company: string | null;

  email: string;

  phone: string | null;

  status: string;

  form_data: string | ClientFormData | null;

  created_at: string;

  updated_at: string;
};

type ClientProjectListRow = RowDataPacket & {
  client_id: number;

  project_id: number;

  project_name: string;

  project_updated_at: string | null;
};

type ClientTicketCountRow = RowDataPacket & {
  client_id: number;

  open_tickets: number;

  last_ticket_activity: string | null;
};

function normalizeClientListStatus(
  value: string | null | undefined,
): ClientListStatus {
  switch (
    String(value ?? "")
      .trim()
      .toLowerCase()
  ) {
    case "inactive":
      return "Inactive";

    case "onboarding":
      return "Onboarding";

    case "paused":
      return "Paused";

    case "completed":
      return "Completed";

    case "active":
    default:
      return "Active";
  }
}

function newestDate(...values: Array<string | null | undefined>) {
  let newest = "";

  let newestTimestamp = 0;

  for (const value of values) {
    if (!value) {
      continue;
    }

    const timestamp = new Date(value).getTime();

    if (Number.isFinite(timestamp) && timestamp > newestTimestamp) {
      newest = value;

      newestTimestamp = timestamp;
    }
  }

  return newest;
}

export async function listClientRows(): Promise<ClientListRow[]> {
  /*
   * DRAFT clients are intentionally
   * excluded from the main client list.
   */
  const [clientRows] = await db.query<ClientListBaseRow[]>(
    `
        SELECT
          c.id,
          c.name,
          c.company,
          c.email,
          c.phone,
          c.status,
          c.form_data,
          c.created_at,
          c.updated_at

        FROM clients c

        WHERE
          c.lifecycle = 'OPEN'

        ORDER BY
          c.updated_at DESC
      `,
  );

  if (clientRows.length === 0) {
    return [];
  }

  const clientIds = clientRows.map((row) => row.id);

  const placeholders = clientIds.map(() => "?").join(",");

  const [projectRows] = await db.query<ClientProjectListRow[]>(
    `
        SELECT
          p.client_id,
          p.id AS project_id,
          p.name AS project_name,
          p.updated_at AS project_updated_at

        FROM projects p

        WHERE
          p.client_id IN (
            ${placeholders}
          )

          AND p.lifecycle = 'OPEN'

        ORDER BY
          p.updated_at DESC
      `,
    clientIds,
  );

  const [ticketRows] = await db.query<ClientTicketCountRow[]>(
    `
        SELECT
          p.client_id,

          COUNT(
            t.ticket_id
          ) AS open_tickets,

          MAX(
            t.updated_at
          ) AS last_ticket_activity

        FROM projects p

        LEFT JOIN tickets t
          ON t.project_id = p.id

          AND t.lifecycle = 'OPEN'

          AND LOWER(
            COALESCE(
              t.status,
              ''
            )
          ) <> 'closed'

        WHERE
          p.client_id IN (
            ${placeholders}
          )

          AND p.lifecycle = 'OPEN'

        GROUP BY
          p.client_id
      `,
    clientIds,
  );

  const projectsByClient = new Map<number, ClientProjectListRow[]>();

  for (const row of projectRows) {
    const current = projectsByClient.get(row.client_id) ?? [];

    current.push(row);

    projectsByClient.set(row.client_id, current);
  }

  const ticketsByClient = new Map<number, ClientTicketCountRow>();

  for (const row of ticketRows) {
    ticketsByClient.set(row.client_id, row);
  }

  return clientRows.map((client): ClientListRow => {
    const form = parseClientFormData(client.form_data);

    const projects = projectsByClient.get(client.id) ?? [];

    const tickets = ticketsByClient.get(client.id);

    const clientStatus = form.clientStatus || client.status;

    const clientTeam = form.teamMembers.map((member) => ({
      id: member.id,

      name: member.name,

      avatar: null,
    }));

    return {
      id: String(client.id),

      clientName:
        form.clientName.trim() || client.company?.trim() || client.name,

      primaryContact: form.primaryContactName.trim() || client.name,

      contactMethod:
        form.preferredContact || (client.phone?.trim() ? "WhatsApp" : "Email"),

      assignedProjects: projects.map((project) => ({
        id: String(project.project_id),

        name: project.project_name,
      })),

      openTickets: Number(tickets?.open_tickets ?? 0),

      clientTeam,

      status: normalizeClientListStatus(clientStatus),

      lastActivity: newestDate(
        client.updated_at,

        projects[0]?.project_updated_at,

        tickets?.last_ticket_activity,

        client.created_at,
      ),
    };
  });
}

export type EmailDriver = "" | "SMTP" | "Mailgun" | "SendGrid" | "Amazon SES";

export type EmailEncryption = "" | "TLS" | "SSL" | "None";

export interface EmailSettings {
  driver: EmailDriver;

  host: string;

  port: string;

  username: string;

  encryption: EmailEncryption;

  fromAddress: string;

  mailgunDomain: string;

  hasPassword: boolean;

  hasMailgunSecret: boolean;
}

type EmailSettingsRow = RowDataPacket & {
  driver: string | null;

  host: string | null;

  port: number | null;

  username: string | null;

  encryption: string | null;

  from_address: string | null;

  password: string | null;

  mailgun_secret: string | null;

  mailgun_domain: string | null;
};

export const defaultEmailSettings: EmailSettings = {
  driver: "",

  host: "",

  port: "",

  username: "",

  encryption: "",

  fromAddress: "",

  mailgunDomain: "",

  hasPassword: false,

  hasMailgunSecret: false,
};

export async function getEmailSettings(): Promise<EmailSettings> {
  const [rows] = await db.query<EmailSettingsRow[]>(
    `
        SELECT
          driver,
          host,
          port,
          username,
          encryption,
          from_address,
          password,
          mailgun_secret,
          mailgun_domain

        FROM email_settings

        WHERE id = 1

        LIMIT 1
      `,
  );

  const row = rows[0];

  if (!row) {
    return defaultEmailSettings;
  }

  return {
    driver: (row.driver ?? "") as EmailDriver,

    host: row.host ?? "",

    port: row.port ? String(row.port) : "",

    username: row.username ?? "",

    encryption: (row.encryption ?? "") as EmailEncryption,

    fromAddress: row.from_address ?? "",

    mailgunDomain: row.mailgun_domain ?? "",

    /*
     * Never send saved secrets
     * to a Client Component.
     */
    hasPassword: Boolean(row.password),

    hasMailgunSecret: Boolean(row.mailgun_secret),
  };
}

type RoleDbRow = RowDataPacket & {
  id: number;

  name: string;

  description: string | null;

  role_type: string | null;

  type: RoleType;

  permissions: string | null;

  updated_at: string;

  user_count: number;
};

function parseRolePermissions(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export async function listRoles(): Promise<RoleRecord[]> {
  const [rows] = await db.query<RoleDbRow[]>(
    `
        SELECT
          r.id,
          r.name,
          r.description,
          r.role_type,
          r.type,
          r.permissions,
          r.updated_at,
          COUNT(u.id) AS user_count

        FROM roles r

        LEFT JOIN users u
          ON u.role = r.name
          AND (
            u.lifecycle IS NULL
            OR u.lifecycle = 'OPEN'
          )

        GROUP BY
          r.id,
          r.name,
          r.description,
          r.role_type,
          r.type,
          r.permissions,
          r.updated_at

        ORDER BY
          CASE
            WHEN r.type = 'SYSTEM'
            THEN 0
            ELSE 1
          END,
          r.name ASC
      `,
  );

  return rows.map(
    (row): RoleRecord => ({
      id: String(row.id),

      name: row.name,

      description: row.description ?? "",

      roleType: row.role_type ?? "",

      type: row.type,

      users: Number(row.user_count ?? 0),

      permissions: parseRolePermissions(row.permissions),

      updatedAt: String(row.updated_at),
    }),
  );
}

export async function findRole(
  id: string,
): Promise<RoleFormRecord | undefined> {
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return undefined;
  }

  const [rows] = await db.query<RoleDbRow[]>(
    `
        SELECT
          r.id,
          r.name,
          r.description,
          r.role_type,
          r.type,
          r.permissions,
          r.updated_at,
          0 AS user_count

        FROM roles r

        WHERE r.id = ?

        LIMIT 1
      `,
    [numericId],
  );

  const row = rows[0];

  if (!row) {
    return undefined;
  }

  return {
    id: String(row.id),

    name: row.name,

    description: row.description ?? "",

    roleType: row.role_type ?? "",

    type: row.type,

    permissions: parseRolePermissions(row.permissions),
  };
}

type AdminUserListDbRow = RowDataPacket & {
  id: number;

  name: string;

  email: string;

  role: string;

  avatar: string | null;

  lifecycle: "OPEN" | "DRAFT";

  created_at: string | null;

  updated_at: string | null;
};

export async function listAdminUserRows(): Promise<
  import("@/types").AdminUserListRow[]
> {
  const [rows] = await db.query<AdminUserListDbRow[]>(
    `
      SELECT
        id,
        name,
        email,
        role,
        avatar,
        lifecycle,
        created_at,
        updated_at

      FROM users

      WHERE
        LOWER(
          COALESCE(
            role,
            ''
          )
        ) NOT IN (
          'resource',
          'client'
        )

      ORDER BY
        updated_at DESC,
        id DESC
    `,
  );

  return rows.map((row): import("@/types").AdminUserListRow => ({
    id: String(row.id),

    name: row.name || "Unnamed User",

    avatar: row.avatar,

    role: String(row.role ?? "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),

    email: row.email,

    addedOn: row.created_at ?? "",

    /*
     * OPEN = registered/active.
     * DRAFT/non-open = inactive for
     * the management view.
     */
    status: row.lifecycle === "OPEN" ? "Active" : "Inactive",

    lastActive: row.updated_at ?? row.created_at ?? "",
  }));
}

type AdminEditorDbRow = RowDataPacket & {
  id: number;

  name: string;

  email: string;

  role: string;

  avatar: string | null;

  lifecycle: "OPEN" | "DRAFT";

  form_data: string | Record<string, unknown> | null;
};

function parseAdminFormData(
  value: AdminEditorDbRow["form_data"],
): import("@/types").AdminFormData {
  let parsed: Record<string, unknown> | undefined;

  try {
    if (typeof value === "string") {
      parsed = JSON.parse(value);
    } else if (value && typeof value === "object") {
      parsed = value;
    }
  } catch {
    parsed = undefined;
  }

  const form = parsed ?? {};

  return {
    firstName: typeof form.firstName === "string" ? form.firstName : "",

    lastName: typeof form.lastName === "string" ? form.lastName : "",

    jobTitle: typeof form.jobTitle === "string" ? form.jobTitle : "",

    email: typeof form.email === "string" ? form.email : "",

    phone: typeof form.phone === "string" ? form.phone : "",

    communicationChannel:
      typeof form.communicationChannel === "string"
        ? form.communicationChannel
        : "",

    skills: Array.isArray(form.skills)
      ? form.skills.filter(
          (value): value is string => typeof value === "string",
        )
      : [],

    experienceLevel:
      typeof form.experienceLevel === "string" ? form.experienceLevel : "",

    employmentType:
      typeof form.employmentType === "string" ? form.employmentType : "",

    status: form.status === "Inactive" ? "Inactive" : "Active",
  };
}

export async function findAdminUser(
  id: string,
): Promise<import("@/types").AdminEditorRecord | undefined> {
  const [rows] = await db.query<AdminEditorDbRow[]>(
    `
        SELECT
          id,
          name,
          email,
          role,
          avatar,
          lifecycle,
          form_data

        FROM users

        WHERE id = ?

        LIMIT 1
      `,
    [id],
  );

  const row = rows[0];

  if (!row) {
    return undefined;
  }

  const formData = parseAdminFormData(row.form_data);

  const [firstName = "", ...remaining] = String(row.name ?? "")
    .trim()
    .split(/\s+/);

  return {
    id: String(row.id),

    name: row.name,

    email: row.email,

    role: row.role,

    avatar: row.avatar,

    lifecycle: row.lifecycle,

    formData: {
      ...formData,

      firstName: formData.firstName || firstName,

      lastName: formData.lastName || remaining.join(" "),

      email: formData.email || row.email,
    },
  };
}
