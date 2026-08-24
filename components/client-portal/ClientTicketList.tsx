"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ClientPortalTicket } from "@/types/clientPortal";

export default function ClientTicketList({ tickets, drafts = false }: { tickets: ClientPortalTicket[]; drafts?: boolean }) {
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
    <section className="cp-list-section">
      <div className="cp-filter-bar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
        <label className="cp-search"><Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tickets" /></label>
      </div>
      <div className="cp-table-wrap">
        <table className="cp-table">
          <thead><tr><th>Ticket</th><th>Project</th><th>Priority</th><th>Status</th><th>Assigned to</th><th>Updated</th><th /></tr></thead>
          <tbody>
            {filtered.map((ticket) => (
              <tr key={ticket.id}>
                <td><strong>{ticket.title || "Untitled ticket"}</strong><span className="cp-muted">{ticket.id}</span></td>
                <td>{ticket.project}</td><td>{ticket.priority}</td><td><span className="cp-badge">{ticket.status}</span></td><td>{ticket.assignee}</td><td>{ticket.updatedAt?.slice(0, 10) || "—"}</td>
                <td><Link className="cp-text-link" href={drafts ? `/client/tickets/new?draft=${encodeURIComponent(ticket.id)}` : `/client/tickets/${ticket.id}`}>{drafts ? "Continue" : "View"}</Link></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} className="cp-empty">No tickets found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
