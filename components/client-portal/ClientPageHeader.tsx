"use client";

import Link from "next/link";
import {
  Plus,
} from "lucide-react";

export default function ClientPageHeader({
  title,
  actionLabel,
  actionHref,
}: {
  title: string;
  crumbs?: Array<{ label: string; href?: string }>;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <header className="cp-page-header">
      <div className="cp-title-row">
        <h1>{title}</h1>
        {actionHref && actionLabel ? (
          <Link className="cp-primary-button" href={actionHref}>
            <Plus size={19} />
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
