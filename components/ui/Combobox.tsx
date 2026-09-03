"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export type ComboboxOption = {
  label: string;
  detail?: string;
  color?: string;
  url?: string;
  id?: string;
};

/**
 * The searchable single-select used by the ticket forms (admin, resource
 * portal, client portal). One implementation replacing the three
 * byte-identical `SearchDropdown` copies that had started to drift.
 *
 * - `validationState` paints the trigger green/red.
 * - `newLabel` + (`newHref` | `onAction`) renders the inline "create new"
 *   affordance next to the search box.
 */
export default function Combobox({
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  options,
  validationState,
  newLabel,
  newHref,
  onAction,
  emptyMessage = "No matches found.",
}: {
  value: string;
  onChange: (value: string, url?: string, id?: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  options: ComboboxOption[];
  validationState?: "valid" | "invalid";
  newLabel?: string;
  newHref?: string;
  onAction?: () => void;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.label === value);
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase()),
  );

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-invalid={validationState === "invalid" || undefined}
        className={cn(
          "field flex items-center justify-between text-left",
          validationState === "invalid" &&
            "!border-red-500 !ring-2 !ring-red-100",
          validationState === "valid" &&
            "!border-green-500 !ring-2 !ring-green-100",
        )}
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {selected?.color ? (
            <span className="inline-flex min-w-0 items-center gap-3">
              <TagChip label={selected.label} color={selected.color} />
              {selected.detail ? (
                <span className="truncate text-sm text-slate-500">
                  {selected.detail}
                </span>
              ) : null}
            </span>
          ) : (
            value || placeholder
          )}
        </span>

        <ChevronDown
          size={16}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
          <div className="flex gap-2">
            <input
              autoFocus
              className="field !min-h-9 !py-2"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
            />

            {newLabel && (newHref || onAction) ? (
              newHref ? (
                <Link
                  href={newHref}
                  className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-[#0284C7] px-3 text-center text-xs font-semibold text-[#0284C7] hover:bg-sky-50"
                >
                  {newLabel}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onAction?.();
                  }}
                  className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-[#0284C7] px-3 text-center text-xs font-semibold text-[#0284C7] hover:bg-sky-50"
                >
                  {newLabel}
                </button>
              )
            ) : null}
          </div>

          <div className="mt-2 max-h-52 overflow-y-auto">
            {filtered.map((option) => (
              <button
                type="button"
                key={`${option.id || ""}-${option.label}`}
                onClick={() => {
                  onChange(option.label, option.url, option.id);
                  close();
                }}
                className="flex w-full items-center gap-3 border-b border-slate-100 px-2 py-2.5 text-left text-sm last:border-0 hover:bg-slate-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {option.color ? (
                    <TagChip label={option.label} color={option.color} />
                  ) : (
                    <span className="font-medium text-slate-700">
                      {option.label}
                    </span>
                  )}
                  {option.detail ? (
                    <span className="truncate text-xs text-slate-500">
                      {option.detail}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}

            {!filtered.length ? (
              <p className="px-2 py-4 text-center text-sm text-slate-400">
                {emptyMessage}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TagChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-28 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-center text-xs font-semibold ring-1 ring-inset",
        color,
      )}
    >
      {label}
    </span>
  );
}
