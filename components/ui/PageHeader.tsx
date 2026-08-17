import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export default function PageHeader({
  title,
  description,
  action,
  actionHref,
  actionIcon: Icon,
}: {
  title: string;
  description?: string;
  action?: string;
  actionHref?: string;
  actionIcon?: LucideIcon;
}) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-[2rem] font-bold tracking-[-0.025em] text-slate-950 sm:text-[2.35rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action && actionHref && (
        <Link className="button-primary" href={actionHref}>
          {Icon && <Icon size={18} />}
          {action}
        </Link>
      )}
    </header>
  );
}
