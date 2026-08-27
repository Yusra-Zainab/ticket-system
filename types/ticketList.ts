export type TicketListPortal = "admin" | "client" | "resource";

export type TicketPriorityType =
  | "Critical"
  | "High"
  | "Medium"
  | "Low"
  | "Not Assigned";

export interface TicketListRow {
  id: string;

  title: string;

  type: string;

  priorityType: TicketPriorityType;

  priorityNumber: number;

  project: string;

  createdBy: string;

  /*
   * Actual tickets.created_by value.
   *
   * Do NOT determine rename permission
   * from the display name.
   */
  createdById: string;

  assignedTo: string;

  createdAt: string;

  updatedAt: string;

  dueDate: string;

  status: string;

  /*
   * Previous names, newest first.
   *
   * Example:
   * [
   *   "Login problem after reset",
   *   "Login reset issue"
   * ]
   */
  history: string[];
}
