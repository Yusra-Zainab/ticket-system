import { cn } from "@/lib/utils";
import type { Status } from "@/types";

export interface StatusBadgeProps {
  status: Status;
  size?: "sm" | "md" | "lg";
}

const colors: Record<Status, string> = {
  Active: "bg-teal-600 text-white ring-teal-700", "On Track": "bg-teal-600 text-white ring-teal-700", Low: "bg-green-600 text-white ring-green-700",
  Critical: "bg-red-600 text-white ring-red-700", Overdue: "bg-red-600 text-white ring-red-700", Blocked: "bg-orange-600 text-white ring-orange-700", High: "bg-orange-600 text-white ring-orange-700",
  "In Progress": "bg-cyan-600 text-white ring-cyan-700", Medium: "bg-yellow-600 text-white ring-yellow-700",
  Open: "bg-violet-600 text-white ring-violet-700", Assigned: "bg-blue-600 text-white ring-blue-700", New: "bg-violet-600 text-white ring-violet-700",
  Paused: "bg-slate-500 text-white ring-slate-600", Closed: "bg-slate-700 text-white ring-slate-800", "Ready for Review": "bg-green-600 text-white ring-green-700",
};

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full font-semibold ring-1 ring-inset",
        colors[status],
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3 py-1.5 text-sm",
      )}
    >
      <span className="mr-1.5 size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
