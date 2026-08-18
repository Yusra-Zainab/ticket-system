"use client";

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
}

export default function ProjectTabs({ value, onValueChange }: ProjectTabsProps) {
  return (
    <div className="project-tabs">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onValueChange(tab)}
          className={cn("project-tab", value === tab && "project-tab-active")}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export { tabs as projectTabs };
