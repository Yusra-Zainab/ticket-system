import { notFound } from "next/navigation";

import ResourcePageHeader from "@/components/resource-portal/ResourcePageHeader";
import ResourceProjectDetails from "@/components/resource-portal/ResourceProjectDetails";
import { requireResourcePageSession } from "@/lib/auth";
import {
  findResourceProject,
  listResourceTickets,
} from "@/lib/resourcePortal";

export const dynamic = "force-dynamic";

export default async function ResourceProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireResourcePageSession();
  const { id } = await params;

  const [project, tickets] = await Promise.all([
    findResourceProject(user, id),
    listResourceTickets(user, "OPEN"),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <div className="resource-project-page">
      <style>{`
        .resource-project-page,
        .resource-project-page * {
          box-sizing: border-box;
        }

        .resource-project-page {
          width: 100%;
          min-width: 0;
          padding: 24px 32px 112px;
          background: #ffffff;
          color: #101828;
          font-family: Geist, var(--font-inter), Inter, Arial, sans-serif;
        }

        .resource-project-page .resource-page-header {
          width: 100%;
          margin-bottom: 24px;
        }

        .resource-project-page .resource-page-header-container,
        .resource-project-page .resource-page-header-inner {
          width: 100%;
        }

        .resource-project-page .resource-page-header-inner {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .resource-project-page .resource-page-title-row {
          display: flex;
          min-height: 40px;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .resource-project-page .resource-page-title-copy {
          min-width: 0;
          flex: 1;
        }

        .resource-project-page .resource-page-title-copy h1 {
          margin: 0;
          color: #101828;
          font-family: Satoshi, var(--font-inter), Inter, sans-serif;
          font-size: 30px;
          font-weight: 700;
          line-height: 38px;
          letter-spacing: 0;
        }

        .resource-project-page .resource-page-supporting-text {
          margin-top: 6px;
          color: #475467;
          font-size: 16px;
          font-weight: 400;
          line-height: 24px;
        }

        .resource-project-page .resource-page-primary-action {
          display: inline-flex;
          min-height: 40px;
          flex: none;
          align-items: center;
          justify-content: center;
          gap: 7px;
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
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
          text-decoration: none;
          box-shadow: 0 1px 2px rgb(16 24 40 / 0.05);
        }

        .resource-project-page .resource-page-primary-action:hover {
          filter: brightness(0.98);
        }

        @media (max-width: 760px) {
          .resource-project-page {
            padding: 20px 16px 112px;
          }

          .resource-project-page .resource-page-title-row {
            align-items: stretch;
            flex-direction: column;
          }

          .resource-project-page .resource-page-primary-action {
            width: 100%;
          }
        }
`}</style>

      <ResourcePageHeader
        title={project.name}
        crumbs={[
          { label: "Projects", href: "/resource-portal/projects" },
          { label: "..." },
          { label: "Project Details" },
        ]}
        supportingText={(
          <span>
            <strong>Client:</strong> {project.client || "—"}
          </span>
        )}
        actionLabel="Create Ticket"
        actionHref={`/resource-portal/tickets/new?projectId=${encodeURIComponent(
          project.id,
        )}`}
      />

      <ResourceProjectDetails project={project} tickets={tickets} />
    </div>
  );
}