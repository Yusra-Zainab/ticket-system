"use client";

import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import type { ProjectStatus as ProjectStatusType } from "@/types";

export interface ProjectStatusProps {
  status?: ProjectStatusType | string | null;
  size?: "sm" | "md";
  subtle?: boolean;
  className?: string;
}

type StatusStyle = {
  background: string;
  border: string;
  color: string;
};

const solidStyles: Record<ProjectStatusType, StatusStyle> = {
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

const subtleStyles: Record<ProjectStatusType, StatusStyle> = {
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

export function normalizeProjectStatus(
  value?: string | null,
): ProjectStatusType {
  const status = value?.trim();

  switch (status) {
    case "Planning":
      return "Planning";

    case "Not Started":
      return "Not Started";

    case "Active":
      return "Active";

    case "On Hold":
      return "On Hold";

    case "At Risk":
      return "At Risk";

    case "Delayed":
      return "Delayed";

    case "Completed":
      return "Completed";

    case "Cancelled":
      return "Cancelled";

    case "Archived":
      return "Archived";

    // Old project values
    case "Open":
      return "Planning";

    case "New":
    case "Assigned":
      return "Not Started";

    case "In Progress":
    case "On Track":
    case "Ready for Review":
      return "Active";

    case "Paused":
      return "On Hold";

    case "Critical":
      return "At Risk";

    case "Blocked":
    case "Overdue":
      return "Delayed";

    case "Closed":
      return "Completed";

    // Blank / null / unknown database values
    default:
      return "Not Started";
  }
}

export default function ProjectStatus({
  status,
  size = "sm",
  subtle = false,
  className,
}: ProjectStatusProps) {
  const normalized =
    normalizeProjectStatus(status);

  const palette = subtle
    ? subtleStyles
    : solidStyles;

  const colors =
    palette[normalized];

  const style: CSSProperties = {
    backgroundColor:
      colors.background,
    borderColor: colors.border,
    color: colors.color,
  };

  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-[16px] border font-medium",
        size === "sm" &&
          "h-[22px] min-w-[122px] px-2 text-[12px] leading-[18px]",
        size === "md" &&
          "h-[28px] min-w-[122px] px-3 text-[14px] leading-5",
        className,
      )}
    >
      {normalized}
    </span>
  );
}