"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Plus,
  RefreshCcw,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

export type ResourceBreadcrumb = {
  label: string;
  href?: string;
};

export default function ResourcePageHeader({
  title,
  crumbs = [],
  supportingText,
  actionLabel,
  actionHref,
  actionIcon: ActionIcon = Plus,
}: {
  title: string;
  crumbs?: ResourceBreadcrumb[];
  supportingText?: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  actionIcon?: LucideIcon;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  return (
    <>
      <header className="resource-page-header">
        <div className="resource-page-header-container">
          <div className="resource-page-header-inner">
            <div className="resource-page-tools-row">
              <nav className="resource-page-breadcrumbs" aria-label="Breadcrumbs">
                <Link
                  href="/resource-portal/dashboard"
                  className="resource-page-home"
                  aria-label="Resource dashboard"
                >
                  <Home size={20} strokeWidth={1.8} />
                </Link>

                {crumbs.map((crumb, index) => {
                  const last = index === crumbs.length - 1;
                  return (
                    <span key={`${crumb.label}-${index}`} className="resource-page-crumb-wrap">
                      <ChevronRight
                        size={16}
                        strokeWidth={1.8}
                        className="resource-page-chevron"
                      />
                      {crumb.href && !last ? (
                        <Link className="resource-page-crumb-link" href={crumb.href}>
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="resource-page-crumb-current">{crumb.label}</span>
                      )}
                    </span>
                  );
                })}
              </nav>

              <div className="resource-page-history-controls">
                <div className="resource-page-history-group">
                  <button type="button" aria-label="Go back" onClick={() => router.back()}>
                    <ChevronLeft size={18} strokeWidth={2} />
                  </button>
                  <button type="button" aria-label="Go forward" onClick={() => router.forward()}>
                    <ChevronRight size={18} strokeWidth={2} />
                  </button>
                </div>

                <button
                  type="button"
                  className="resource-page-refresh"
                  aria-label="Refresh page"
                  disabled={refreshing}
                  onClick={() => {
                    setRefreshing(true);
                    router.refresh();
                    window.setTimeout(() => setRefreshing(false), 850);
                  }}
                >
                  <RefreshCcw
                    size={18}
                    strokeWidth={1.8}
                    className={refreshing ? "resource-page-refreshing" : ""}
                  />
                </button>
              </div>
            </div>

            <div className="resource-page-title-row">
              <div className="resource-page-title-copy">
                <h1>{title}</h1>
                {supportingText ? (
                  <div className="resource-page-supporting-text">{supportingText}</div>
                ) : null}
              </div>

              {actionLabel && actionHref ? (
                <Link className="resource-page-primary-action" href={actionHref}>
                  <ActionIcon size={20} strokeWidth={1.9} />
                  <span>{actionLabel}</span>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <style>{`
        .resource-page-header {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          width: 100%;
          margin-bottom: 24px;
        }

        .resource-page-header-container {
          width: 100%;
        }

        .resource-page-header-inner {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
        }

        .resource-page-tools-row,
        .resource-page-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .resource-page-breadcrumbs,
        .resource-page-crumb-wrap,
        .resource-page-history-controls,
        .resource-page-history-group {
          display: flex;
          align-items: center;
        }

        .resource-page-breadcrumbs {
          gap: 8px;
          min-width: 0;
        }

        .resource-page-home,
        .resource-page-crumb-link,
        .resource-page-crumb-current {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 28px;
          border-radius: 6px;
          text-decoration: none;
          font-family: Inter, Arial, sans-serif;
          font-size: 14px;
          line-height: 20px;
        }

        .resource-page-home {
          width: 28px;
          padding: 4px;
          color: #0284c7;
        }

        .resource-page-crumb-wrap {
          gap: 8px;
        }

        .resource-page-chevron {
          color: #d0d5dd;
          flex: 0 0 auto;
        }

        .resource-page-crumb-link {
          padding: 4px 8px;
          color: #0284c7;
          font-weight: 500;
        }

        .resource-page-crumb-current {
          padding: 4px 8px;
          background: #e6f8fb;
          color: #0284c7;
          font-weight: 600;
        }

        .resource-page-history-controls {
          gap: 8px;
          margin-left: auto;
        }

        .resource-page-history-group {
          overflow: hidden;
          border-radius: 8px;
          box-shadow: 0 0.888889px 1.77778px rgba(16, 24, 40, 0.05);
        }

        .resource-page-history-group button,
        .resource-page-refresh {
          display: inline-flex;
          width: 32px;
          height: 32px;
          align-items: center;
          justify-content: center;
          border: 0;
          background: #e6f8fb;
          color: #0284c7;
          cursor: pointer;
        }

        .resource-page-history-group button:first-child {
          border-right: 0.888889px solid #b2e8f2;
        }

        .resource-page-refresh {
          border-radius: 8px;
          box-shadow: 0 0.888889px 1.77778px rgba(16, 24, 40, 0.05);
        }

        .resource-page-refreshing {
          animation: resourcePageSpin 0.7s linear infinite;
        }

        .resource-page-title-row {
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .resource-page-title-copy {
          min-width: 320px;
          flex: 1 1 auto;
        }

        .resource-page-title-copy h1 {
          margin: 0;
          font-family: Satoshi, var(--font-satoshi), Geist, sans-serif;
          font-size: 30px;
          font-weight: 700;
          line-height: 38px;
          color: #101828;
        }

        .resource-page-supporting-text {
          margin-top: 4px;
          font-family: Inter, Arial, sans-serif;
          font-size: 16px;
          line-height: 24px;
          color: #475467;
        }

        .resource-page-primary-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 40px;
          border-radius: 8px;
          background: linear-gradient(66.43deg, #0284c7 12.82%, #06b6d4 47.68%, #22d3ee 82.54%);
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
          color: #ffffff;
          text-decoration: none;
          font-family: Geist, sans-serif;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
        }

        @keyframes resourcePageSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .resource-page-header-container {
            padding: 0 16px;
          }

          .resource-page-tools-row,
          .resource-page-title-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .resource-page-history-controls {
            margin-left: 0;
          }

          .resource-page-title-copy {
            min-width: 0;
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .resource-page-breadcrumbs {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </>
  );
}
