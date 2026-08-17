'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import DataTable, { type Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockProjects } from '@/data/mockData';
import { formatDate } from '@/lib/utils';
import type { Project, Status } from '@/types';

export default function ProjectsTable() {
  const [projects, setProjects] = useState(mockProjects); const [query, setQuery] = useState(''); const [status, setStatus] = useState('All'); const [selected, setSelected] = useState<string[]>([]);
  const filtered = useMemo(() => projects.filter((project) => (project.name + project.client).toLowerCase().includes(query.toLowerCase()) && (status === 'All' || project.status === status)), [projects, query, status]);
  const updateStatus = (next: Status) => { setProjects((items) => items.map((item) => selected.includes(item.id) ? { ...item, status: next } : item)); setSelected([]); };
  const columns: Column<Project>[] = [
    { key: 'name', label: 'Project', sortable: true, render: (_, row) => <Link className="font-semibold text-slate-900 hover:text-sky-600" href={`/projects/${row.id}`}>{row.name}<span className="mt-0.5 block text-xs font-normal text-slate-400">{row.client}</span></Link> },
    { key: 'status', label: 'Status', sortable: true, render: (value) => <StatusBadge status={value as Status} /> },
    { key: 'progress', label: 'Progress', sortable: true, render: (value) => <div className="flex min-w-36 items-center gap-2"><div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-sky-500" style={{ width: `${value}%` }} /></div><span className="text-xs font-semibold">{String(value)}%</span></div> },
    { key: 'dueDate', label: 'Due date', sortable: true, render: (value) => formatDate(String(value)) },
    { key: 'team', label: 'Team', render: (value) => `${(value as string[]).length} members` },
  ];
  return <div className="space-y-4"><div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><span className="sr-only">Search projects</span><input className="field pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects or clients…" /></label><select aria-label="Filter project status" className="field sm:w-48" value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Active</option><option>Critical</option><option>On Track</option><option>In Progress</option><option>Paused</option></select></div>{selected.length > 0 && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3"><span className="text-sm font-bold text-sky-800">{selected.length} selected</span><select className="field w-auto py-1.5" defaultValue="" onChange={(event) => updateStatus(event.target.value as Status)}><option value="" disabled>Change status</option><option>Active</option><option>In Progress</option><option>Paused</option><option>Closed</option></select><button onClick={() => { setProjects((items) => items.filter((item) => !selected.includes(item.id))); setSelected([]); }} className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600"><Trash2 size={15} />Delete</button></div>}<DataTable columns={columns} data={filtered} hasBulkActions selectedIds={selected} onSelectionChange={setSelected} /></div>;
}
