import ResourceDashboardView from "@/components/resource-portal/ResourceDashboardView";
import ResourcePageHeader from "@/components/resource-portal/ResourcePageHeader";
import { requireResourcePageSession } from "@/lib/auth";
import {
  getResourceDashboardStats,
  listResourceProjects,
  listResourceTickets,
} from "@/lib/resourcePortal";

export const dynamic = "force-dynamic";

export default async function ResourceDashboardPage() {
  const user = await requireResourcePageSession();

  const [stats, projects, tickets] = await Promise.all([
    getResourceDashboardStats(user),
    listResourceProjects(user),
    listResourceTickets(user, "OPEN"),
  ]);

  return (
    <div className="resource-page resource-dashboard-page">
      <ResourcePageHeader
        title="Resource Dashboard"
        actionLabel="Create a New Ticket"
        actionHref="/resource/tickets/new"
      />

      <ResourceDashboardView
        stats={stats}
        projects={projects}
        tickets={tickets}
      />

      <style>{`
        /* =========================================================
           RESOURCE DASHBOARD
           CSS translated directly from the supplied Resource Dashboard
           design. Kept in this page file so the rendered dashboard does
           not depend on globals.css.
           ========================================================= */

        .resource-page,
        .resource-page * {
          box-sizing: border-box;
        }

        .resource-dashboard-page {
          width: 100%;
          min-width: 0;
          min-height: 838px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 16px;
          padding: 32px 0 120px;
          background: #ffffff;
          color: #101828;
          font-family: Geist, var(--font-inter), Inter, system-ui, sans-serif;
        }

        .resource-dashboard-page button,
        .resource-dashboard-page input,
        .resource-dashboard-page select,
        .resource-dashboard-page textarea {
          font: inherit;
        }

        /* =========================================================
           HEADER
           ========================================================= */

        .resource-dashboard-page .resource-page-header {
          display: flex;
          width: 100%;
          flex-direction: column;
          align-items: flex-start;
          gap: 24px;
        }

        .resource-dashboard-page .resource-page-header-container {
          width: 100%;
          padding: 0 32px;
        }

        .resource-dashboard-page .resource-page-header-inner {
          display: flex;
          width: 100%;
          flex-direction: column;
          gap: 20px;
        }

        /* Breadcrumb/history row is hidden in the supplied dashboard. */
        .resource-dashboard-page .resource-page-tools-row {
          display: none;
        }

        .resource-dashboard-page .resource-page-title-row {
          display: flex;
          width: 100%;
          min-height: 61px;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid #eaecf0;
          padding-bottom: 20px;
        }

        .resource-dashboard-page .resource-page-title-copy {
          min-width: 320px;
          flex: 1 1 auto;
        }

        .resource-dashboard-page .resource-page-title-copy h1 {
          width: 100%;
          margin: 0;
          color: #101828;
          font-family: Satoshi, var(--font-satoshi), Geist, sans-serif;
          font-size: 30px;
          font-style: normal;
          font-weight: 700;
          line-height: 38px;
          letter-spacing: 0;
        }

        .resource-dashboard-page .resource-page-supporting-text {
          display: none;
        }

        .resource-dashboard-page .resource-page-primary-action {
          display: inline-flex;
          width: 191px;
          height: 40px;
          flex: 0 0 191px;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border: 0;
          border-radius: 8px;
          background: linear-gradient(
            66.43deg,
            #0284c7 12.82%,
            #06b6d4 47.68%,
            #22d3ee 82.54%
          );
          padding: 10px 14px;
          color: #ffffff;
          font-family: Geist, var(--font-inter), Inter, sans-serif;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
          text-decoration: none;
          white-space: nowrap;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
          transition:
            filter 0.15s ease,
            transform 0.15s ease;
        }

        .resource-dashboard-page .resource-page-primary-action:hover {
          filter: brightness(0.97);
        }

        .resource-dashboard-page .resource-page-primary-action:active {
          transform: translateY(1px);
        }

        /* =========================================================
           SECTIONS
           ========================================================= */

        .resource-dashboard-section,
        .resource-dashboard-project-section {
          display: flex;
          width: 100%;
          min-width: 0;
          flex-direction: column;
          align-items: stretch;
          gap: 16px;
          padding: 0 32px;
        }

        .resource-dashboard-section-title {
          margin: 0;
          color: #101828;
          font-family: Satoshi, var(--font-satoshi), Geist, sans-serif;
          font-size: 24px;
          font-style: normal;
          font-weight: 700;
          line-height: 32px;
        }

        /* =========================================================
           ALERTS BOARD
           1376px design width -> four 338px cards with 8px gaps.
           ========================================================= */

        .resource-dashboard-metrics {
          display: grid;
          width: 100%;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .resource-dashboard-metric {
          display: flex;
          min-width: 0;
          height: 104px;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          border-radius: 12px;
          padding: 16px 12px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
        }

        .resource-dashboard-metric > span {
          width: 100%;
          font-family: Geist, var(--font-inter), Inter, sans-serif;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
        }

        .resource-dashboard-metric > strong {
          width: 100%;
          font-family: "Geist Mono", ui-monospace, SFMono-Regular, monospace;
          font-size: 36px;
          font-weight: 600;
          line-height: 44px;
          text-align: right;
          letter-spacing: -0.02em;
        }

        .resource-dashboard-metric-purple {
          background: #f3eeff;
          color: #5b2be0;
        }

        .resource-dashboard-metric-amber {
          background: #fff7e6;
          color: #d97706;
        }

        .resource-dashboard-metric-red {
          background: #feecec;
          color: #dc2626;
        }

        .resource-dashboard-metric-orange {
          background: #fff1e6;
          color: #ea580c;
        }

        /* =========================================================
           PROJECT HEALTH TOOLBAR
           ========================================================= */

        .resource-dashboard-project-toolbar {
          position: relative;
          display: flex;
          width: 100%;
          height: 40px;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .resource-dashboard-project-select {
          position: relative;
          width: 200px;
          flex: 0 0 200px;
        }

        .resource-dashboard-project-trigger {
          display: flex;
          width: 200px;
          height: 40px;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
          border: 0;
          border-radius: 8px;
          background: #f2f4f7;
          padding: 10px 14px;
          color: #344054;
          font-family: Geist, var(--font-inter), Inter, sans-serif;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
          text-align: left;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
        }

        .resource-dashboard-project-trigger:disabled {
          cursor: default;
          opacity: 0.65;
        }

        .resource-dashboard-project-trigger > span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .resource-dashboard-project-trigger svg {
          flex: none;
          color: #344054;
          transition: transform 0.15s ease;
        }

        .resource-dashboard-chevron-open {
          transform: rotate(180deg);
        }

        .resource-dashboard-project-menu-backdrop {
          position: fixed !important;
          z-index: 40 !important;
          inset: 0 !important;
          width: auto !important;
          height: auto !important;
          border: 0 !important;
          background: transparent !important;
        }

        .resource-dashboard-project-menu {
          position: absolute;
          z-index: 50;
          top: 46px;
          left: 0;
          width: 300px;
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #eaecf0;
          border-radius: 10px;
          background: #ffffff;
          padding: 6px;
          box-shadow: 0 12px 28px rgba(16, 24, 40, 0.14);
        }

        .resource-dashboard-project-menu button {
          display: flex;
          width: 100%;
          min-height: 42px;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 0;
          border-radius: 7px;
          background: #ffffff;
          padding: 9px 10px;
          color: #344054;
          font-size: 14px;
          text-align: left;
        }

        .resource-dashboard-project-menu button:hover {
          background: #f9fafb;
        }

        .resource-dashboard-project-menu button svg {
          flex: none;
          color: #0284c7;
        }

        .resource-dashboard-see-more {
          display: inline-flex;
          min-width: 120px;
          height: 40px;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border-radius: 8px;
          padding: 10px 14px;
          color: #06b6d4;
          font-family: Geist, var(--font-inter), Inter, sans-serif;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
          text-decoration: none;
        }

        .resource-dashboard-see-more:hover {
          background: #f8fdff;
          color: #0284c7;
        }

        /* =========================================================
           PROJECT HEALTH CONTENT
           250px project-health card + priority ticket table using
           all remaining horizontal space.
           ========================================================= */

        .resource-dashboard-health-grid {
          display: grid;
          width: 100%;
          min-width: 0;
          grid-template-columns: 250px minmax(0, 1fr);
          gap: 16px;
          align-items: stretch;
        }

        .resource-dashboard-health-card {
          display: grid;
          width: 250px;
          height: 222px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          grid-template-rows: repeat(2, minmax(0, 1fr));
          gap: 8px;
          border: 1px solid #eaecf0;
          border-radius: 12px;
          background: #06b6d4;
          padding: 8px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
        }

        .resource-dashboard-health-box {
          display: flex;
          min-width: 0;
          min-height: 0;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 8px;
          border: 1px solid #eaecf0;
          border-radius: 8px;
          background: #ffffff;
          padding: 0 8px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
        }

        .resource-dashboard-health-box > span {
          color: #101828;
          font-family: Geist, var(--font-inter), Inter, sans-serif;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
        }

        .resource-dashboard-health-box > strong {
          max-width: 100%;
          overflow: hidden;
          color: #101828;
          font-family: Satoshi, var(--font-satoshi), Geist, sans-serif;
          font-size: 24px;
          font-weight: 700;
          line-height: 32px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .resource-dashboard-health-summary {
          gap: 0;
        }

        .resource-dashboard-health-summary strong {
          font-family: Geist, var(--font-inter), Inter, sans-serif;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
        }

        .resource-dashboard-health-summary strong:nth-child(1) {
          color: #0f766e;
        }

        .resource-dashboard-health-summary strong:nth-child(2) {
          color: #dc2626;
        }

        .resource-dashboard-health-summary strong:nth-child(3) {
          color: #ea580c;
        }

        .resource-dashboard-date {
          font-size: 14px !important;
          line-height: 20px !important;
        }

        /* =========================================================
           STATUS / PRIORITY BADGES
           ========================================================= */

        .resource-status-badge,
        .resource-priority-badge {
          display: inline-flex;
          width: fit-content;
          max-width: 100%;
          min-height: 22px;
          align-items: center;
          justify-content: center;
          border: 1px solid;
          border-radius: 16px;
          padding: 2px 8px;
          font-family: Inter, var(--font-inter), sans-serif;
          font-size: 12px;
          font-weight: 500;
          line-height: 18px;
          white-space: nowrap;
        }

        .resource-status-info {
          border-color: #b9e6fe;
          background: #f0f9ff;
          color: #026aa2;
        }

        .resource-status-danger {
          border-color: #fecdca;
          background: #fef3f2;
          color: #b42318;
        }

        .resource-status-success {
          border-color: #abefc6;
          background: #ecfdf3;
          color: #067647;
        }

        .resource-priority-critical {
          border-color: #fecdca;
          background: #fef3f2;
          color: #b42318;
        }

        .resource-priority-high {
          border-color: #fedf89;
          background: #fffaeb;
          color: #b54708;
        }

        .resource-priority-medium {
          border-color: #b9e6fe;
          background: #f0f9ff;
          color: #026aa2;
        }

        .resource-priority-low {
          border-color: #abefc6;
          background: #ecfdf3;
          color: #067647;
        }

        .resource-priority-not-assigned {
          border-color: #d0d5dd;
          background: #f2f4f7;
          color: #475467;
        }

        /* =========================================================
           DASHBOARD TABLE CARDS
           ========================================================= */

        .resource-dashboard-table-card {
          display: flex;
          min-width: 0;
          height: 222px;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #eaecf0;
          border-radius: 12px;
          background: #ffffff;
          box-shadow:
            0 1px 3px rgba(16, 24, 40, 0.1),
            0 1px 2px rgba(16, 24, 40, 0.06);
        }

        .resource-dashboard-table-card-wide {
          width: 100%;
          height: 196px;
        }

        .resource-dashboard-card-header {
          display: flex;
          width: 100%;
          height: 44px;
          flex: 0 0 44px;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid #d0d5dd;
          background: #ffffff;
          padding: 12px 24px;
        }

        .resource-dashboard-card-header > strong {
          min-width: 0;
          overflow: hidden;
          color: #101828;
          font-family: Geist, var(--font-inter), Inter, sans-serif;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .resource-dashboard-card-header > span {
          display: inline-flex;
          height: 22px;
          flex: none;
          align-items: center;
          border: 1px solid #e9d7fe;
          border-radius: 16px;
          background: #f9f5ff;
          padding: 2px 8px;
          color: #6941c6;
          font-family: Inter, var(--font-inter), sans-serif;
          font-size: 12px;
          font-weight: 500;
          line-height: 18px;
        }

        .resource-dashboard-card-content {
          width: 100%;
          min-width: 0;
          flex: 1 1 auto;
          overflow: auto;
        }

        .resource-dashboard-mini-table,
        .resource-dashboard-activity-table {
          width: 100%;
          border-collapse: collapse;
          border-spacing: 0;
          table-layout: fixed;
        }

        .resource-dashboard-mini-table th {
          height: 34px;
          border-bottom: 1px solid #eaecf0;
          background: #ffffff;
          padding: 8px 24px;
          color: #475467;
          font-family: Geist, var(--font-inter), Inter, sans-serif;
          font-size: 12px;
          font-weight: 600;
          line-height: 18px;
          text-align: left;
          white-space: nowrap;
        }

        .resource-dashboard-mini-table td {
          height: 36px;
          border-bottom: 1px solid #eaecf0;
          padding: 8px 24px;
          color: #475467;
          font-family: Geist, var(--font-inter), Inter, sans-serif;
          font-size: 14px;
          font-weight: 400;
          line-height: 20px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .resource-dashboard-mini-table tbody tr:nth-child(odd) {
          background: #f9fafb;
        }

        .resource-dashboard-mini-table tbody tr:nth-child(even) {
          background: #ffffff;
        }

        .resource-dashboard-mini-table td:first-child {
          color: #101828;
          font-weight: 500;
        }

        .resource-dashboard-mini-table a,
        .resource-dashboard-activity-table a {
          color: inherit;
          text-decoration: none;
        }

        .resource-dashboard-mini-table a:hover,
        .resource-dashboard-activity-table a:hover {
          color: #0284c7;
        }

        .resource-dashboard-priority-table th:first-child {
          width: 56%;
        }

        .resource-dashboard-priority-table th:nth-child(2) {
          width: 20%;
        }

        .resource-dashboard-priority-table th:nth-child(3) {
          width: 24%;
        }

        .resource-center {
          text-align: center !important;
        }

        /* =========================================================
           RECENT ACTIVITY
           44px header + 152px content = 196px design height.
           ========================================================= */

        .resource-dashboard-activity-table {
          min-width: 900px;
        }

        .resource-dashboard-activity-table th {
          height: 44px;
          border-bottom: 1px solid #eaecf0;
          background: #ffffff;
          padding: 12px 24px;
          color: #475467;
          font-family: Geist, var(--font-inter), Inter, sans-serif;
          font-size: 12px;
          font-weight: 600;
          line-height: 18px;
          text-align: left;
          white-space: nowrap;
        }

        .resource-dashboard-activity-table td {
          height: 36px;
          border-bottom: 1px solid #eaecf0;
          padding: 8px 24px;
          color: #475467;
          font-family: Geist, var(--font-inter), Inter, sans-serif;
          font-size: 14px;
          font-weight: 400;
          line-height: 20px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .resource-dashboard-activity-table tbody tr:nth-child(odd) {
          background: #f9fafb;
        }

        .resource-dashboard-activity-table tbody tr:nth-child(even) {
          background: #ffffff;
        }

        .resource-dashboard-activity-table td:first-child {
          color: #101828;
          font-weight: 500;
        }

        .resource-dashboard-empty-cell {
          height: 80px !important;
          color: #98a2b3 !important;
          font-size: 13px !important;
          font-weight: 400 !important;
          text-align: center !important;
          white-space: normal !important;
        }

        /* =========================================================
           RESPONSIVE
           ========================================================= */

        @media (max-width: 1280px) {
          .resource-dashboard-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .resource-dashboard-health-grid {
            grid-template-columns: 250px minmax(0, 1fr);
          }

        }

        @media (max-width: 900px) {
          .resource-dashboard-page .resource-page-title-row {
            align-items: stretch;
            flex-direction: column;
          }

          .resource-dashboard-page .resource-page-title-copy {
            min-width: 0;
          }

          .resource-dashboard-page .resource-page-primary-action {
            width: fit-content;
            flex-basis: auto;
          }

          .resource-dashboard-health-grid {
            grid-template-columns: 1fr;
          }

          .resource-dashboard-health-card {
            width: 250px;
          }

        }

        @media (max-width: 640px) {
          .resource-dashboard-page {
            padding-top: 20px;
          }

          .resource-dashboard-page .resource-page-header-container,
          .resource-dashboard-section,
          .resource-dashboard-project-section {
            padding-left: 16px;
            padding-right: 16px;
          }

          .resource-dashboard-page .resource-page-primary-action {
            width: 100%;
          }

          .resource-dashboard-metrics {
            grid-template-columns: 1fr;
          }

          .resource-dashboard-project-toolbar {
            height: auto;
            align-items: stretch;
            flex-direction: column;
          }

          .resource-dashboard-project-select,
          .resource-dashboard-project-trigger {
            width: 100%;
            flex-basis: auto;
          }

          .resource-dashboard-project-menu {
            width: 100%;
          }

          .resource-dashboard-see-more {
            width: fit-content;
          }

          .resource-dashboard-health-card {
            width: 100%;
          }

          .resource-dashboard-card-header {
            padding-left: 16px;
            padding-right: 16px;
          }
        }
      `}</style>
    </div>
  );
}