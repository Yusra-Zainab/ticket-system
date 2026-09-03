import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The stacked up/down chevrons every sortable table header uses. Highlights
 * the up half on ascending sort, the down half on descending, both muted
 * when this column isn't the active sort. One implementation so Tickets /
 * Projects / Resources / Clients / Users tables all match (item 23).
 */
export function SortArrows({
  direction,
  size = 13,
}: {
  direction?: "asc" | "desc" | null;
  size?: number;
}) {
  return (
    <span className="inline-flex flex-col items-center leading-[0]">
      <ChevronDown
        size={size}
        className={cn(
          "-mb-[5px] rotate-180",
          direction === "asc" ? "text-[#0284C7]" : "text-[#98A2B3]",
        )}
      />
      <ChevronDown
        size={size}
        className={cn(
          direction === "desc" ? "text-[#0284C7]" : "text-[#98A2B3]",
        )}
      />
    </span>
  );
}
