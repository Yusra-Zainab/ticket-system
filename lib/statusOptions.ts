import type {
  AdminUserStatus,
  ClientListStatus,
  ProjectPriority,
  ProjectStatus,
  Status,
} from "@/types";

export const ticketStatusDescriptions: Record<
  Extract<Status, "Open" | "Assigned" | "In Progress" | "Blocked" | "Ready for Review" | "Closed">,
  string
> = {
  Open: "Newly created and ready to be picked up",
  Assigned: "Ownership is set and work is about to begin",
  "In Progress": "Actively being worked on",
  Blocked: "Waiting on a dependency or decision",
  "Ready for Review": "Completed and waiting for review",
  Closed: "Finished and no longer active",
};

export const projectStatusDescriptions: Record<ProjectStatus, string> = {
  Planning: "Scope and planning are being finalized",
  "Not Started": "Approved but work has not started yet",
  Active: "Work is actively progressing",
  "On Hold": "Paused until the next signal to continue",
  "At Risk": "Progress is moving but key risks are present",
  Delayed: "Timeline has slipped and needs attention",
  Completed: "All planned work is complete",
  Cancelled: "Work was intentionally stopped",
  Archived: "Closed and retained for reference",
};

export const projectPriorityDescriptions: Record<ProjectPriority, string> = {
  Critical: "Requires immediate action and close monitoring",
  High: "Important work that should be handled soon",
  Medium: "Standard priority with normal scheduling",
  Low: "Can be planned after higher priority work",
  "Not Assigned": "Priority has not been set yet",
};

export const ticketPriorityDescriptions = {
  Critical: "Immediate action required",
  High: "Needs quick attention",
  Medium: "Normal priority",
  Low: "Can be handled later",
  "Not Assigned": "Priority has not been assigned yet",
} as const;

export const ticketTypeDescriptions = {
  Bug: "Something is broken and needs a fix",
  Task: "A standard work item or assignment",
  "Change Request": "An existing behavior needs to be changed",
  "New Feature": "A new capability needs to be built",
  Feedback: "Input or suggestions from users or stakeholders",
  "Support Request": "Operational or user support is needed",
  "UI/UX Issue": "A design or usability issue needs attention",
  "Content Update": "Copy, media, or content needs revision",
  "Technical Issue": "A technical problem needs investigation",
  "Testing / QA": "Validation or testing work is required",
  Maintenance: "Routine upkeep or technical maintenance",
  "Urgent Fix": "A high-urgency issue needs fast resolution",
  "System Down": "A major outage or service interruption exists",
} as const;

export const clientStatusDescriptions: Record<ClientListStatus, string> = {
  Active: "Engaged and actively working with the team",
  Inactive: "Currently not engaged in active work",
  Onboarding: "Setup and kickoff are still in progress",
  Paused: "Work is temporarily stopped",
  Completed: "Planned engagement has been delivered",
};

export const resourceStatusDescriptions = {
  Active: "Available as an active internal resource",
  Inactive: "Not currently active in the resource pool",
} as const;

export const adminStatusDescriptions: Record<AdminUserStatus, string> = {
  Active: "Can access the system and perform assigned work",
  Inactive: "Access is disabled or temporarily unavailable",
};
