"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import ProjectStatus from "@/components/features/ProjectStatus";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

export default function ProjectsDraftsTable({
  initialProjects,
}: {
  initialProjects: Project[];
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [deleting, setDeleting] = useState<string>();

  const remove = async (id: string) => {
    try {
      setDeleting(id);

      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 404) {
        throw new Error("Unable to delete project draft.");
      }

      setProjects((items) => items.filter((item) => item.id !== id));
      router.refresh();
    } finally {
      setDeleting(undefined);
    }
  };

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#E4E7EC] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse">
          <thead className="h-14 bg-[#F9FAFB] text-left text-[13px] font-semibold text-[#475467]">
            <tr>
              <th className="px-5">Project Name</th>
              <th className="px-5">Client</th>
              <th className="px-5">Status</th>
              <th className="px-5">Team</th>
              <th className="px-5">Last Updated</th>
              <th className="w-[120px] px-5 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {projects.map((project, index) => (
              <tr
                key={project.id}
                className={cn(
                  "h-[78px] border-t border-[#EAECF0]",
                  index % 2 ? "bg-[#F9FAFB]" : "bg-white",
                )}
              >
                <td className="px-5">
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-semibold text-[#101828] hover:text-[#0284C7]"
                  >
                    {project.name}
                  </Link>
                </td>

                <td className="px-5 text-sm text-[#475467]">
                  {project.client}
                </td>

                <td className="px-5">
                  <ProjectStatus status={project.status} />
                </td>

                <td className="px-5 text-sm text-[#475467]">
                  {project.teamMembers.length
                    ? `${project.teamMembers.length} member${
                        project.teamMembers.length === 1 ? "" : "s"
                      }`
                    : "-"}
                </td>

                <td className="px-5 text-sm text-[#475467]">
                  {new Date(project.lastUpdated).toLocaleString()}
                </td>

                <td className="px-5">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/projects/${project.id}/edit`}
                      aria-label={`Edit ${project.name}`}
                      className="row-icon"
                    >
                      <Pencil size={17} />
                    </Link>

                    <button
                      type="button"
                      disabled={deleting === project.id}
                      onClick={() => void remove(project.id)}
                      aria-label={`Delete ${project.name}`}
                      className="row-icon text-red-600 disabled:opacity-50"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!projects.length && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-16 text-center text-sm text-[#98A2B3]"
                >
                  No project drafts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
