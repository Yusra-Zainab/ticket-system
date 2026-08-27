"use client";

import styles from "@/components/features/ProjectTabs.module.css";
import { cn } from "@/lib/utils";

const tabs = [
  "Overview",
  "Tickets",
  "Modules",
  "Team",
  "Files",
  "Timeline",
  "Reports",
  "Settings",
] as const;

export type ProjectTab = (typeof tabs)[number];

export interface ProjectTabsProps {
  value: ProjectTab;

  onValueChange: (tab: ProjectTab) => void;

  tabs?: readonly ProjectTab[];
}

export default function ProjectTabs({
  value,

  onValueChange,

  tabs: visibleTabs = tabs,
}: ProjectTabsProps) {
  return (
    <div className={styles.scrollWrap}>
      <div className={styles.tabs} role="tablist" aria-label="Project details">
        {visibleTabs.map((tab) => {
          const active = value === tab;

          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onValueChange(tab)}
              className={cn(
                styles.tab,

                active && styles.active,
              )}
            >
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { tabs as projectTabs };
