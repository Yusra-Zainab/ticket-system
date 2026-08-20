import { Avatar } from "./Avatar";
import StatusBadge from "./StatusBadge";
import type { Activity } from "@/types";

export interface ActivityTimelineProps {
  activities: Activity[];
  maxItems?: number;
}
export default function ActivityTimeline({
  activities,
  maxItems,
}: ActivityTimelineProps) {
  return (
    <ol className="space-y-5">
      {activities.slice(0, maxItems).map((activity, index) => (
        <li key={activity.id} className="relative flex gap-3">
          {index < activities.slice(0, maxItems).length - 1 && (
            <span className="absolute left-[17px] top-10 h-full w-px bg-slate-200" />
          )}
          <Avatar name={activity.user} />
          <div className="min-w-0 flex-1 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate-700">
                <strong className="font-semibold text-slate-900">
                  {activity.user}
                </strong>{" "}
                {activity.text}
              </p>
              {activity.status && (
                <StatusBadge status={activity.status} size="sm" />
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">{activity.timestamp}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
