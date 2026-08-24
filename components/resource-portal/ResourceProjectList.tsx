"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ResourcePortalProject } from "@/types/resourcePortal";

export default function ResourceProjectList({ projects }: { projects: ResourcePortalProject[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) => `${project.name} ${project.client} ${project.status} ${project.priority}`.toLowerCase().includes(q));
  }, [projects, query]);

  return (
    <section className="rp-list-section">
      <div className="rp-filter-bar">
        <label className="rp-search"><Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search assigned projects" /></label>
      </div>
      <div className="rp-table-wrap">
        <table className="rp-table">
          <thead><tr><th>Project</th><th>Client</th><th>Status</th><th>Priority</th><th>Progress</th><th>Open tickets</th><th /></tr></thead>
          <tbody>
            {filtered.map((project) => (
              <tr key={project.id}>
                <td><strong>{project.name}</strong></td>
                <td>{project.client}</td>
                <td><span className="rp-badge">{project.status}</span></td>
                <td>{project.priority}</td>
                <td><div className="rp-progress"><span style={{ width: `${Math.max(0, Math.min(100, project.progress))}%` }} /></div><small>{project.progress}%</small></td>
                <td>{project.openTickets}</td>
                <td><Link className="rp-text-link" href={`/resource/projects/${project.id}`}>View</Link></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} className="rp-empty">No assigned projects found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
