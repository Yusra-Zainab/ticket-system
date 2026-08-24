"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export default function StickyToast({
  message,
  kind = "success",
  onDismiss,
}: {
  message: string;
  kind?: "success" | "error";
  onDismiss: () => void;
}) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "ticket-toast",
        kind === "error" ? "ticket-toast-error" : "ticket-toast-success",
      )}
    >
      <p className="text-sm font-medium">{message}</p>
      <button
        type="button"
        className="ml-auto"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <X size={17} />
      </button>
    </div>
  );
}
