import "server-only";

import type { RowDataPacket } from "mysql2/promise";

import { db } from "@/lib/db";

export type ProjectListTicketMetrics = {
  openTickets: number;
  criticalTickets: number;
};

function parseJsonRecord(
  value:
    | string
    | Record<string, unknown>
    | null,
) {
  if (!value) {
    return {} as Record<
      string,
      unknown
    >;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(
      value,
    ) as Record<
      string,
      unknown
    >;
  } catch {
    return {} as Record<
      string,
      unknown
    >;
  }
}

/**
 * Returns the same ticket counters used by the Admin projects list.
 *
 * Callers must pass only project IDs that the current portal user has
 * already been authorized to view.
 *
 * Both portal pages first call their existing scoped project queries:
 *
 * Client:
 *   listClientProjects(user)
 *
 * Resource:
 *   listResourceProjects(user)
 *
 * So this helper never discovers projects for a user. It only calculates
 * ticket metrics for the already-authorized IDs.
 */
export async function getProjectListTicketMetrics(
  projectIds: readonly string[],
) {
  const ids = Array.from(
    new Set(
      projectIds
        .map((value) =>
          Number(value),
        )
        .filter(
          (value) =>
            Number.isInteger(
              value,
            ) && value > 0,
        ),
    ),
  );

  const metrics = new Map<
    string,
    ProjectListTicketMetrics
  >();

  if (!ids.length) {
    return metrics;
  }

  const placeholders = ids
    .map(() => "?")
    .join(",");

  const [rows] =
    await db.query<
      (RowDataPacket & {
        project_id: number;

        form_data:
          | string
          | Record<
              string,
              unknown
            >
          | null;
      })[]
    >(
      `
        SELECT
          project_id,
          form_data

        FROM tickets

        WHERE
          lifecycle = 'OPEN'

          AND project_id IN (
            ${placeholders}
          )
      `,
      ids,
    );

  for (const row of rows) {
    const key = String(
      row.project_id,
    );

    const current =
      metrics.get(key) ?? {
        openTickets: 0,
        criticalTickets: 0,
      };

    current.openTickets += 1;

    const data =
      parseJsonRecord(
        row.form_data,
      );

    const tags = Array.isArray(
      data.tags,
    )
      ? data.tags
          .filter(
            (
              tag,
            ): tag is string =>
              typeof tag ===
              "string",
          )
          .map((tag) =>
            tag
              .trim()
              .toLowerCase(),
          )
      : [];

    if (
      tags.includes("critical")
    ) {
      current.criticalTickets +=
        1;
    }

    metrics.set(
      key,
      current,
    );
  }

  /*
   * Make sure projects with zero tickets still have explicit counters.
   */
  for (const id of ids) {
    const key = String(id);

    if (!metrics.has(key)) {
      metrics.set(key, {
        openTickets: 0,
        criticalTickets: 0,
      });
    }
  }

  return metrics;
}