"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ClientPortalProject } from "@/types/clientPortal";

export default function ClientProjectList({ projects }: { projects: ClientPortalProject[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) => `${project.name} ${project.status} ${project.priority}`.toLowerCase().includes(q));
  }, [projects, query]);

  return (
    <section className="cp-list-section">
      <div className="cp-filter-bar">
        <label className="cp-search"><Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" /></label>
      </div>
      <div className="cp-table-wrap">
        <table className="cp-table">
          <thead><tr><th>Project</th><th>Status</th><th>Priority</th><th>Progress</th><th>Open tickets</th><th>Due date</th><th /></tr></thead>
          <tbody>
            {filtered.map((project) => (
              <tr key={project.id}>
                <td><strong>{project.name}</strong><span className="cp-muted">{project.company}</span></td>
                <td><span className="cp-badge">{project.status}</span></td>
                <td>{project.priority}</td>
                <td><div className="cp-progress"><span style={{ width: `${Math.max(0, Math.min(100, project.progress))}%` }} /></div><small>{project.progress}%</small></td>
                <td>{project.openTickets}</td>
                <td>{project.dueDate || "Not set"}</td>
                <td><Link className="cp-text-link" href={`/client/projects/${project.id}`}>View</Link></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} className="cp-empty">No projects found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
