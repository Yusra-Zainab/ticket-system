import "server-only";

import type { RowDataPacket } from "mysql2/promise";

import { db } from "@/lib/db";

export type ProjectModuleTicketStat = {
  module: string;

  subModule: string;

  openTickets: number;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseJsonRecord(
  value: string | Record<string, unknown> | null,
): Record<string, unknown> {
  if (!value) {
    return {};
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    const parsed = JSON.parse(value);

    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function key(
  moduleName: string,

  subModuleName: string,
) {
  return `${moduleName.trim().toLowerCase()}\u0000${subModuleName
    .trim()
    .toLowerCase()}`;
}

/**
 * Count OPEN-lifecycle tickets by module/submodule
 * for a project that has already been authorized
 * for the current portal user.
 *
 * Client:
 * findClientProject() must run successfully first.
 *
 * Resource:
 * findResourceProject() must run successfully first.
 */
export async function listProjectModuleTicketStatsForAuthorizedProject(
  projectId: string,
): Promise<ProjectModuleTicketStat[]> {
  const numericProjectId = Number(projectId);

  if (!Number.isInteger(numericProjectId) || numericProjectId <= 0) {
    return [];
  }

  const [rows] = await db.query<
    (RowDataPacket & {
      form_data: string | Record<string, unknown> | null;
    })[]
  >(
    `
        SELECT
          form_data

        FROM tickets

        WHERE
          lifecycle = 'OPEN'

          AND project_id = ?
      `,
    [numericProjectId],
  );

  const counts = new Map<
    string,
    {
      module: string;

      subModule: string;

      openTickets: number;
    }
  >();

  for (const row of rows) {
    const data = parseJsonRecord(row.form_data);

    /*
     * TicketForm currently saves:
     *
     * form_data.module
     * form_data.subModule
     */
    const moduleName = text(data.module);

    const subModuleName = text(data.subModule);

    /*
     * Tickets without a module cannot contribute
     * to a module-specific count.
     */
    if (!moduleName) {
      continue;
    }

    const mapKey = key(moduleName, subModuleName);

    const current = counts.get(mapKey);

    if (current) {
      current.openTickets += 1;

      continue;
    }

    counts.set(mapKey, {
      module: moduleName,

      subModule: subModuleName,

      openTickets: 1,
    });
  }

  return Array.from(counts.values()).sort((left, right) => {
    const moduleCompare = left.module.localeCompare(right.module, undefined, {
      sensitivity: "base",

      numeric: true,
    });

    if (moduleCompare !== 0) {
      return moduleCompare;
    }

    return left.subModule.localeCompare(right.subModule, undefined, {
      sensitivity: "base",

      numeric: true,
    });
  });
}
