'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import DataTable, { type Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import type { Client, Status, User } from '@/types';

export default function DirectoryTable({ type, clients: initialClients = [], users: initialUsers = [] }: { type: 'clients' | 'resources'; clients?: Client[]; users?: User[] }) {
  const [query, setQuery] = useState('');
  const clients = useMemo(() => initialClients.filter((item) => (item.name + item.company + item.email).toLowerCase().includes(query.toLowerCase())), [query, initialClients]);
  const resources = useMemo(() => initialUsers.filter((item) => (item.name + item.role + item.email).toLowerCase().includes(query.toLowerCase())), [query, initialUsers]);
  const clientColumns: Column<Client>[] = [
    { key: 'name', label: 'Client', sortable: true, render: (_, row) => <Link className="font-semibold text-slate-900 hover:text-sky-600" href={`/clients/${row.id}`}>{row.company}<span className="mt-0.5 block text-xs font-normal text-slate-400">{row.name}</span></Link> },
    { key: 'email', label: 'Email', sortable: true }, { key: 'projects', label: 'Projects', sortable: true }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value as Status} /> }, { key: 'joined', label: 'Client since', sortable: true },
  ];
  const resourceColumns: Column<User>[] = [
    { key: 'name', label: 'Resource', sortable: true, render: (_, row) => <Link className="font-semibold text-slate-900 hover:text-sky-600" href={`/resources/${row.id}`}>{row.name}<span className="mt-0.5 block text-xs font-normal text-slate-400">{row.email}</span></Link> },
    { key: 'role', label: 'Role', sortable: true }, { key: 'skills', label: 'Skills', render: (value) => <div className="flex flex-wrap gap-1">{(value as string[]).slice(0, 2).map((skill) => <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-xs">{skill}</span>)}</div> }, { key: 'workload', label: 'Workload', sortable: true, render: (value) => <span className={Number(value) > 85 ? 'font-bold text-red-600' : 'font-semibold text-slate-700'}>{String(value)}%</span> }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value as Status} /> },
  ];
  return <div className="space-y-4"><label className="relative block max-w-lg"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><span className="sr-only">Search</span><input className="field pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${type}…`} /></label>{type === 'clients' ? <DataTable columns={clientColumns} data={clients} pageSize={5} /> : <DataTable columns={resourceColumns} data={resources} pageSize={5} />}</div>;
}
