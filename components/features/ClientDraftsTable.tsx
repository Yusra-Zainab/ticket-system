"use client";

import Link from "next/link";

import { Trash2, X } from "lucide-react";

import { useRouter } from "next/navigation";

import { useState } from "react";

import { cn } from "@/lib/utils";

import type { ClientDraftRow } from "@/types";

export default function ClientDraftsTable({
  initialDrafts,
  detailBaseHref = "/clients",
}: {
  initialDrafts: ClientDraftRow[];
  detailBaseHref?: string;
}) {
  const router = useRouter();

  const [drafts, setDrafts] = useState(initialDrafts);

  const [deleteTarget, setDeleteTarget] = useState<
    ClientDraftRow | undefined
  >();

  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  async function deleteDraft() {
    if (!deleteTarget || deleting) {
      return;
    }

    setDeleting(true);

    setError("");

    try {
      const response = await fetch(
        `/api/clients/${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "DELETE",
        },
      );

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Unable to delete draft.",
        );
      }

      setDrafts((current) =>
        current.filter((draft) => draft.id !== deleteTarget.id),
      );

      setDeleteTarget(undefined);

      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to delete draft.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#EAECF0] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed border-collapse">
            <thead className="h-11 bg-[#F9FAFB]">
              <tr>
                <th className="w-[220px] border-b border-[#EAECF0] px-8 text-left text-xs font-semibold text-[#475467]">
                  Client Name
                </th>

                <th className="border-b border-[#EAECF0] px-4 text-left text-xs font-semibold text-[#475467]">
                  Primary Contact
                </th>

                <th className="border-b border-[#EAECF0] px-4 text-center text-xs font-semibold text-[#475467]">
                  Client Type
                </th>

                <th className="border-b border-[#EAECF0] px-4 text-center text-xs font-semibold text-[#475467]">
                  Client Source
                </th>

                <th className="border-b border-[#EAECF0] px-4 text-center text-xs font-semibold text-[#475467]">
                  Status
                </th>

                <th className="border-b border-[#EAECF0] px-4 text-center text-xs font-semibold text-[#475467]">
                  Last Saved
                </th>

                <th className="w-[70px] border-b border-[#EAECF0]" />
              </tr>
            </thead>

            <tbody>
              {drafts.map((draft, index) => (
                <tr
                  key={draft.id}
                  className={cn(
                    "h-[72px] border-b border-[#EAECF0] last:border-b-0",
                    index % 2 ? "bg-[#F2F4F7]" : "bg-white",
                  )}
                >
                  <td className="px-8">
                    <Link
                      href={`${detailBaseHref}/${draft.id}/edit?draft=1`}
                      className="text-sm font-semibold text-[#101828] transition hover:text-[#0284C7]"
                    >
                      {draft.clientName}
                    </Link>
                  </td>

                  <td className="px-4 text-sm text-[#475467]">
                    {draft.primaryContact}
                  </td>

                  <td className="px-4 text-center text-sm text-[#475467]">
                    {draft.clientType}
                  </td>

                  <td className="px-4 text-center text-sm text-[#475467]">
                    {draft.clientSource}
                  </td>

                  <td className="px-4 text-center">
                    <span className="inline-flex rounded-full border border-[#D0D5DD] bg-[#F9FAFB] px-2.5 py-1 text-xs font-medium text-[#475467]">
                      Draft
                    </span>
                  </td>

                  <td className="px-4 text-center text-sm text-[#475467]">
                    {formatDate(draft.updatedAt)}
                  </td>

                  <td className="px-3 text-center">
                    <button
                      type="button"
                      aria-label={`Delete ${draft.clientName}`}
                      title="Delete draft"
                      onClick={() => setDeleteTarget(draft)}
                      className="mx-auto grid size-9 place-items-center rounded-lg text-[#98A2B3] transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}

              {!drafts.length && (
                <tr>
                  <td colSpan={7} className="h-40 text-center">
                    <div className="mx-auto max-w-sm">
                      <p className="text-sm font-semibold text-[#101828]">
                        No client drafts
                      </p>

                      <p className="mt-1 text-sm text-[#667085]">
                        Saved client drafts will appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setDeleteTarget(undefined);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="ticket-modal !w-[410px]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-700">
                  Confirmation
                </h2>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Are you sure you want to delete{" "}
                  <strong>{deleteTarget.clientName}</strong>?
                </p>
              </div>

              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(undefined)}
                className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(undefined)}
                className="button-secondary"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={() => void deleteDraft()}
                className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",

    day: "numeric",

    year: "numeric",

    hour: "numeric",

    minute: "2-digit",
  }).format(date);
}
