'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

export interface Column<T> { key: keyof T; label: string; render?: (value: T[keyof T], row: T) => React.ReactNode; sortable?: boolean; className?: string }
export interface DataTableProps<T extends { id: string }> { columns: Column<T>[]; data: T[]; onSelectRow?: (row: T) => void; hasBulkActions?: boolean; hasPagination?: boolean; pageSize?: number; selectedIds?: string[]; onSelectionChange?: (ids: string[]) => void }

export default function DataTable<T extends { id: string }>({ columns, data, onSelectRow, hasBulkActions = false, hasPagination = true, pageSize = 5, selectedIds, onSelectionChange }: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: keyof T; direction: 'asc' | 'desc' }>();
  const [page, setPage] = useState(1);
  const [internalSelection, setInternalSelection] = useState<string[]>([]);
  const selection = selectedIds ?? internalSelection;
  const updateSelection = onSelectionChange ?? setInternalSelection;
  const sorted = useMemo(() => [...data].sort((a, b) => {
    if (!sort) return 0;
    return String(a[sort.key]).localeCompare(String(b[sort.key]), undefined, { numeric: true }) * (sort.direction === 'asc' ? 1 : -1);
  }), [data, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visible = hasPagination ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted;
  const allVisibleSelected = visible.length > 0 && visible.every((row) => selection.includes(row.id));
  const toggleAll = () => updateSelection(allVisibleSelected ? selection.filter((id) => !visible.some((row) => row.id === id)) : Array.from(new Set([...selection, ...visible.map((row) => row.id)])));
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-slate-200 bg-slate-50"><tr>{hasBulkActions && <th className="w-12 px-5 py-4"><input aria-label="Select visible rows" checked={allVisibleSelected} onChange={toggleAll} type="checkbox" className="checkbox" /></th>}{columns.map((column) => <th key={String(column.key)} className="px-5 py-4 text-xs font-semibold text-slate-500"><button disabled={!column.sortable} onClick={() => column.sortable && setSort((current) => ({ key: column.key, direction: current?.key === column.key && current.direction === 'asc' ? 'desc' : 'asc' }))} className="inline-flex items-center gap-1.5 disabled:cursor-default">{column.label}{column.sortable && (sort?.key === column.key ? sort.direction === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} /> : <ChevronsUpDown size={13} />)}</button></th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={row.id} onClick={() => onSelectRow?.(row)} className={index % 2 ? 'bg-white transition-colors hover:bg-sky-50/30' : 'bg-slate-50/70 transition-colors hover:bg-sky-50/40'}>{hasBulkActions && <td className="px-5 py-5" onClick={(event) => event.stopPropagation()}><input aria-label={`Select row ${row.id}`} checked={selection.includes(row.id)} onChange={() => updateSelection(selection.includes(row.id) ? selection.filter((id) => id !== row.id) : [...selection, row.id])} type="checkbox" className="checkbox" /></td>}{columns.map((column) => <td key={String(column.key)} className="px-5 py-5 text-sm text-slate-600">{column.render ? column.render(row[column.key], row) : String(row[column.key])}</td>)}</tr>)}</tbody></table></div>{visible.length === 0 && <div className="px-6 py-12 text-center text-sm text-slate-500">No matching records found.</div>}{hasPagination && <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm"><span className="text-slate-500">Showing {visible.length} of {sorted.length} results</span><div className="flex items-center gap-2"><button className="button-secondary px-3 py-1.5" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="grid size-9 place-items-center rounded-lg bg-sky-500 font-bold text-white">{page}</span><button className="button-secondary px-3 py-1.5" disabled={page === pages} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>}</div>;
}
