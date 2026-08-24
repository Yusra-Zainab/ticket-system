"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ResourcePortalTicket } from "@/types/resourcePortal";

export default function ResourceTicketList({ tickets, drafts = false }: { tickets: ResourcePortalTicket[]; drafts?: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const statuses = Array.from(new Set(tickets.map((ticket) => ticket.status)));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesQuery = !q || `${ticket.id} ${ticket.title} ${ticket.project} ${ticket.assignee}`.toLowerCase().includes(q);
      return matchesQuery && (status === "All" || ticket.status === status);
    });
  }, [tickets, query, status]);

  return (
    <section className="rp-list-section">
      <div className="rp-filter-bar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
        <label className="rp-search"><Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tickets" /></label>
      </div>
      <div className="rp-table-wrap">
        <table className="rp-table">
          <thead><tr><th>Ticket</th><th>Project</th><th>Priority</th><th>Status</th><th>Assigned to</th><th>Updated</th><th /></tr></thead>
          <tbody>
            {filtered.map((ticket) => (
              <tr key={ticket.id}>
                <td><strong>{ticket.title || "Untitled ticket"}</strong><span className="rp-muted">{ticket.id}</span></td>
                <td>{ticket.project}</td><td>{ticket.priority}</td><td><span className="rp-badge">{ticket.status}</span></td><td>{ticket.assignee}</td><td>{ticket.updatedAt?.slice(0, 10) || "—"}</td>
                <td><Link className="rp-text-link" href={drafts ? `/resource/tickets/new?draft=${encodeURIComponent(ticket.id)}` : `/resource/tickets/${ticket.id}`}>{drafts ? "Continue" : "View"}</Link></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} className="rp-empty">No tickets found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
