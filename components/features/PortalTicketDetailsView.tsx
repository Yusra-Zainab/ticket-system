"use client";

import TicketDetailsView, {
  type TicketDetailAction,
} from "@/components/features/TicketDetailsView";
import type { Status, Ticket, TicketAttachment } from "@/types";

type Portal = "client" | "resource";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function priorityNumber(value: unknown): Ticket["priority"] {
  switch (text(value).toLowerCase()) {
    case "critical":
      return 1;
    case "high":
      return 2;
    case "medium":
      return 3;
    default:
      return 4;
  }
}

function status(value: unknown): Status {
  switch (text(value)) {
    case "Active":
      return "In Progress";
    case "QA":
    case "Validation":
      return "Ready for Review";
    case "Resolved":
    case "Cancelled":
      return "Closed";
    case "Awaiting":
      return "Open";
    case "Open":
    case "In Progress":
    case "Blocked":
    case "Ready for Review":
    case "Closed":
      return text(value) as Status;
    default:
      return "Open";
  }
}

function attachments(value: unknown): TicketAttachment[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index): TicketAttachment[] => {
    const row = record(item);
    const url = text(row.url);
    const name = text(row.name);
    if (!url || !name) return [];

    return [
      {
        id: text(row.id, `attachment-${index}`),
        name,
        mimeType: text(row.mimeType, "application/octet-stream"),
        size: Number(row.size ?? 0) || 0,
        url,
        uploadedAt: text(row.uploadedAt),
      },
    ];
  });
}

function comments(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const row = record(item);
    return {
      id: String(row.id ?? `comment-${index}`),
      userId: Number(row.userId) || null,
      user: text(row.user ?? row.authorName ?? row.name, "User"),
      avatar: typeof row.avatar === "string" ? row.avatar : null,
      createdAt: text(row.createdAt ?? row.time),
      time: text(row.time ?? row.createdAt),
      content: text(row.content ?? row.text),
      text: text(row.text ?? row.content),
      attachments: stringArray(row.attachments),
    };
  });
}

function activities(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function permissionsFor(
  portal: Portal,
  source: Record<string, unknown>,
): TicketDetailAction[] {
  if (portal === "client") {
    return ["Upload File", "Add Comment"];
  }

  const permissions = record(source.permissions);
  if (Object.keys(permissions).length) {
    const actions: TicketDetailAction[] = [];
    if (permissions.canChangeStatus === true) actions.push("Change Status");
    if (permissions.canUpload === true) actions.push("Upload File");
    if (permissions.canComment === true) actions.push("Add Comment");
    if (permissions.canEditDetails === true) actions.push("Edit Ticket Details");
    if (permissions.canSelfAssign === true) actions.push("Assign Resource");
    return actions;
  }

  return ["Change Status", "Upload File", "Add Comment"];
}

export default function PortalTicketDetailsView({
  portal,
  ticket,
  currentUserId,
  currentUserName,
}: {
  portal: Portal;
  ticket: unknown;
  currentUserId: string;
  currentUserName: string;
}) {
  const source = record(ticket);
  const form = record(source.formData);
  const assignee = text(source.assignee ?? source.assignedTo);
  const reporter = text(source.reporter ?? source.createdBy, "System");
  const createdAt = text(source.createdAt ?? source.created);
  const dueDate = text(source.dueDate);
  const links = stringArray(source.links).length
    ? stringArray(source.links)
    : stringArray(form.urls ?? form.links);
  const files = attachments(source.attachments ?? form.attachments);
  const storedComments = Array.isArray(source.comments)
    ? comments(source.comments)
    : comments(form.comments);
  const storedActivities = Array.isArray(source.activities)
    ? activities(source.activities)
    : activities(form.activity ?? form.activities);

  const normalized: Ticket = {
    id: text(source.id),
    title: text(source.title, "Untitled Ticket"),
    project: text(source.project, "Not set"),
    status: status(source.status),
    priority: priorityNumber(source.priority ?? source.priorityType),
    assignedTo: assignee,
    reporter,
    created: createdAt,
    updatedAt: text(source.updatedAt ?? source.updated_at ?? createdAt),
    dueDate,
    description: text(source.description),
    tags: [],
    formData: {
      ...form,
      projectId: text(source.projectId ?? form.projectId),
      project: text(source.project, "Not set"),
      module: text(source.module ?? form.module),
      subModule: text(source.subModule ?? form.subModule),
      type: text(source.type ?? form.type, "Not set"),
      createdBy: reporter,
      assignedTo: assignee,
      dueDate,
      estimatedTime: text(
        source.estimatedTime ?? form.estimatedTime,
        "Not set",
      ),
      urls: links,
      attachments: files,
      comments: storedComments,
      activity: storedActivities,
    },
  };

  return (
    <TicketDetailsView
      ticket={normalized}
      portal={portal}
      currentRole={portal === "client" ? "Client" : "Developer"}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      allowedActions={permissionsFor(portal, source)}
    />
  );
}


