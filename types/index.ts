export type Status =
  | "Active"
  | "Critical"
  | "In Progress"
  | "Open"
  | "Closed"
  | "Overdue"
  | "Blocked"
  | "Paused"
  | "On Track"
  | "Ready for Review"
  | "Low"
  | "Medium"
  | "High"
  | "New"
  | "Assigned"
  | "Completed"
  | "Reviewed"
  | "Awaiting"
  | "QA"
  | "Validation"
  | "Resolved"
  | "Reopened"
  | "Cancelled";

export type ProjectStatus =
  | "Planning"
  | "Not Started"
  | "Active"
  | "On Hold"
  | "At Risk"
  | "Delayed"
  | "Completed"
  | "Cancelled"
  | "Archived";

export type ProjectPriority =
  | "Critical"
  | "High"
  | "Medium"
  | "Low"
  | "Not Assigned";

export interface ProjectTeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string | null;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  projects: number;
  status: Status;
  joined: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  progress: number;
  dueDate: string;
  startDate: string;
  budget: number;
  description: string;
  team: string[];
  teamMembers: ProjectTeamMember[];
  openTickets: number;
  criticalTickets: number;
  lastUpdated: string;
  priority: ProjectPriority;
}

export interface Ticket {
  id: string;
  title: string;
  project: string;
  status: Status;
  priority: 1 | 2 | 3 | 4;
  assignedTo: string;
  reporter: string;
  created: string;
  dueDate: string;
  description: string;
  tags: string[];
  formData?: TicketFormData;
}

export interface TicketAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export type TicketFormData = Record<string, unknown> & {
  attachments?: TicketAttachment[];
};

export interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: Status;
  workload: number;
  skills: string[];
  avatar?: string | null;
}

export interface Activity {
  id: string;
  timestamp: string;
  text: string;
  user: string;
  status?: Status;
  avatar?: string;
}

export interface Notification {
  id: string;
  category: "Tickets" | "Mentions" | "Deadlines" | "System";
  title: string;
  body: string;
  href: string;
  time: string;
  unread: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  users: number;
  permissions: string[];
}