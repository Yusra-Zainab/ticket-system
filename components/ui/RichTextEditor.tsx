'use client';

import { useRef } from 'react';
import { AlignLeft, Bold, Italic, Link, List, Underline } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tool = 'bold' | 'italic' | 'underline' | 'list' | 'link' | 'align';
export interface RichTextEditorProps { value: string; onChange: (value: string) => void; placeholder?: string; toolbar?: Tool[] }
const icons = { bold: Bold, italic: Italic, underline: Underline, list: List, link: Link, align: AlignLeft };
const commands: Record<Tool, string> = { bold: 'bold', italic: 'italic', underline: 'underline', list: 'insertUnorderedList', link: 'createLink', align: 'justifyLeft' };

export default function RichTextEditor({ value, onChange, placeholder = 'Write a detailed description…', toolbar = ['bold', 'italic', 'underline', 'list', 'link', 'align'] }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const run = (tool: Tool) => { const argument = tool === 'link' ? window.prompt('Enter a secure URL') ?? '' : undefined; document.execCommand(commands[tool], false, argument); ref.current?.focus(); onChange(ref.current?.innerHTML ?? ''); };
  return <div className="overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100"><div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">{toolbar.map((tool) => { const Icon = icons[tool]; return <button key={tool} type="button" title={tool} aria-label={tool} className={cn('grid size-8 place-items-center rounded-md text-slate-500 hover:bg-white hover:text-slate-900')} onClick={() => run(tool)}><Icon size={16} /></button>; })}</div><div ref={ref} contentEditable suppressContentEditableWarning onInput={(event) => onChange(event.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: value }} data-placeholder={placeholder} className="rich-editor min-h-40 p-4 text-sm text-slate-700 outline-none" /></div>;
}
