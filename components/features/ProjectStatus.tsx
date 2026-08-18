"use client";

import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import type { ProjectStatus as ProjectStatusType } from "@/types";

export interface ProjectStatusProps {
  status: ProjectStatusType | string;
  size?: "sm" | "md";
  subtle?: boolean;
  className?: string;
}

type StatusStyle = {
  background: string;
  border: string;
  color: string;
};

/*
 * Exact project-status colors from the Figma reference.
 *
 * Planning     #7C3AED
 * Not Started  #4B5563
 * Active       #2563EB
 * On Hold      #D97706
 * At Risk      #EA580C
 * Delayed      #DC2626
 * Completed    #16A34A
 * Cancelled    #BE123C
 * Archived     #6B7280
 */
const solidStyles: Record<string, StatusStyle> = {
  Planning: {
    background: "#7C3AED",
    border: "#7C3AED",
    color: "#FFFFFF",
  },

  "Not Started": {
    background: "#4B5563",
    border: "#4B5563",
    color: "#FFFFFF",
  },

  Active: {
    background: "#2563EB",
    border: "#2563EB",
    color: "#FFFFFF",
  },

  "On Hold": {
    background: "#D97706",
    border: "#D97706",
    color: "#FFFFFF",
  },

  "At Risk": {
    background: "#EA580C",
    border: "#EA580C",
    color: "#FFFFFF",
  },

  Delayed: {
    background: "#DC2626",
    border: "#DC2626",
    color: "#FFFFFF",
  },

  Completed: {
    background: "#16A34A",
    border: "#16A34A",
    color: "#FFFFFF",
  },

  Cancelled: {
    background: "#BE123C",
    border: "#BE123C",
    color: "#FFFFFF",
  },

  Archived: {
    background: "#6B7280",
    border: "#6B7280",
    color: "#FFFFFF",
  },
};

const subtleStyles: Record<string, StatusStyle> = {
  Planning: {
    background: "#F5F3FF",
    border: "#DDD6FE",
    color: "#6D28D9",
  },

  "Not Started": {
    background: "#F9FAFB",
    border: "#D1D5DB",
    color: "#4B5563",
  },

  Active: {
    background: "#EFF6FF",
    border: "#BFDBFE",
    color: "#1D4ED8",
  },

  "On Hold": {
    background: "#FFFBEB",
    border: "#FDE68A",
    color: "#B45309",
  },

  "At Risk": {
    background: "#FFF7ED",
    border: "#FED7AA",
    color: "#C2410C",
  },

  Delayed: {
    background: "#FEF2F2",
    border: "#FECACA",
    color: "#B91C1C",
  },

  Completed: {
    background: "#F0FDF4",
    border: "#BBF7D0",
    color: "#15803D",
  },

  Cancelled: {
    background: "#FFF1F2",
    border: "#FECDD3",
    color: "#BE123C",
  },

  Archived: {
    background: "#F3F4F6",
    border: "#D1D5DB",
    color: "#4B5563",
  },
};

/*
 * Temporary compatibility for existing projects that may still
 * contain the old project status values.
 *
 * Once the database has been migrated to the new nine statuses,
 * these aliases can be removed.
 */
function normalizeProjectStatus(
  status: string,
): string {
  switch (status) {
    case "Open":
      return "Planning";

    case "New":
      return "Not Started";

    case "Assigned":
      return "Not Started";

    case "In Progress":
      return "Active";

    case "On Track":
      return "Active";

    case "Paused":
      return "On Hold";

    case "Critical":
      return "At Risk";

    case "Blocked":
      return "Delayed";

    case "Closed":
      return "Completed";

    case "Ready for Review":
      return "Active";

    default:
      return status;
  }
}

export default function ProjectStatus({
  status,
  size = "sm",
  subtle = false,
  className,
}: ProjectStatusProps) {
  const normalizedStatus =
    normalizeProjectStatus(String(status));

  const palette = subtle
    ? subtleStyles
    : solidStyles;

  const statusStyle =
    palette[normalizedStatus] ??
    palette.Archived;

  const style: CSSProperties = {
    backgroundColor:
      statusStyle.background,
    borderColor: statusStyle.border,
    color: statusStyle.color,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-[16px] border font-medium",
        size === "sm" &&
          "h-[22px] min-w-[122px] px-2 text-[12px] leading-[18px]",
        size === "md" &&
          "h-[28px] min-w-[122px] px-3 text-[14px] leading-5",
        className,
      )}
      style={style}
    >
      {normalizedStatus}
    </span>
  );
}