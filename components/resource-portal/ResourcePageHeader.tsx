"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronRight, Home, Plus, RotateCw } from "lucide-react";
import { useState } from "react";

export default function ResourcePageHeader({
  title,
  crumbs = [],
  actionLabel,
  actionHref,
}: {
  title: string;
  crumbs?: Array<{ label: string; href?: string }>;
  actionLabel?: string;
  actionHref?: string;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  return (
    <header className="rp-page-header">
      <div className="rp-breadcrumb-row">
        <nav className="rp-breadcrumbs" aria-label="Breadcrumbs">
          <Link href="/resource/dashboard" className="rp-crumb-icon" aria-label="Dashboard"><Home size={18} /></Link>
          {crumbs.map((crumb) => (
            <span className="rp-crumb-part" key={`${crumb.label}-${crumb.href ?? "current"}`}>
              <ChevronRight size={15} />
              {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span className="rp-crumb-current">{crumb.label}</span>}
            </span>
          ))}
        </nav>
        <div className="rp-history-controls">
          <button type="button" onClick={() => router.back()} aria-label="Go back"><ArrowLeft size={17} /></button>
          <button type="button" onClick={() => router.forward()} aria-label="Go forward"><ArrowRight size={17} /></button>
          <button type="button" onClick={() => { setRefreshing(true); router.refresh(); setTimeout(() => setRefreshing(false), 800); }} aria-label="Refresh">
            <RotateCw size={17} className={refreshing ? "rp-spin" : ""} />
          </button>
        </div>
      </div>
      <div className="rp-title-row">
        <h1>{title}</h1>
        {actionHref && actionLabel ? <Link className="rp-primary-button" href={actionHref}><Plus size={19} />{actionLabel}</Link> : null}
      </div>
    </header>
  );
}
