import { cn, initials } from '@/lib/utils';

export function Avatar({ name, className }: { name: string; className?: string }) {
  return <span aria-label={name} className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700', className)}>{initials(name)}</span>;
}
