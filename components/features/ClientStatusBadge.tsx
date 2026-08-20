"use client";

import { cn } from "@/lib/utils";
import type { ClientListStatus } from "@/types";

export interface ClientStatusBadgeProps {
  status: ClientListStatus;
  size?: "sm" | "md";
  className?: string;
}

const statusColors: Record<
  ClientListStatus,
  string
> = {
  Active:
    "border-[#15803D] bg-[#15803D] text-white",
    
  Inactive:
    "border-[#D0D5DD] bg-[#F9FAFB] text-[#475467]",

  Onboarding:
    "border-[#1D4ED8] bg-[#1D4ED8] text-white",

  Paused:
    "border-[#B45309] bg-[#B45309] text-white",

  Completed:
    "border-[#475569] bg-[#475569] text-white",
};

export default function ClientStatusBadge({
  status,
  size = "sm",
  className,
}: ClientStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-[16px] border font-medium",
        statusColors[status],

        size === "sm" &&
          "h-[22px] min-w-[122px] px-2 text-[12px] leading-[18px]",

        size === "md" &&
          "h-[28px] min-w-[122px] px-3 text-[14px] leading-5",

        className,
      )}
    >
      {status}
    </span>
  );
}