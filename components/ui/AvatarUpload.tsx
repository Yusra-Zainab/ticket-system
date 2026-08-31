"use client";

import { useId, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";

import {
  AVATAR_ACCEPT,
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
} from "@/lib/avatarConstants";
import { cn } from "@/lib/utils";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0]![0]! + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * Circular profile-photo picker. `value` is whatever should sit in the
 * form's `avatar` field — an existing "/api/avatars/…" URL, a
 * "data:image/…" URL from a fresh pick, or "" for none. `onChange` gets
 * the new value; the parent submits it and the server (`persistUserAvatar`)
 * turns a data URL into a stored image + serving URL.
 */
export default function AvatarUpload({
  value,
  onChange,
  name,
  size = 96,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  name: string;
  size?: number;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function pick(file: File | undefined) {
    setError("");
    if (!file) return;

    if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("Use a PNG, JPG, WebP or GIF image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError("That image is over 2 MB — pick a smaller one.");
      return;
    }

    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      setBusy(false);
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.onerror = () => {
      setBusy(false);
      setError("Could not read that file.");
    };
    reader.readAsDataURL(file);
  }

  const hasImage = Boolean(value);

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div
        className="relative shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200"
        style={{ width: size, height: size }}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-slate-500">
            {initialsOf(name)}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#0284C7] px-3 py-1.5 text-xs font-semibold text-[#0284C7] hover:bg-sky-50 disabled:opacity-60"
          >
            <Camera size={14} />
            {busy ? "Reading…" : hasImage ? "Change photo" : "Upload photo"}
          </button>

          {hasImage && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setError("");
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Trash2 size={14} />
              Remove
            </button>
          )}
        </div>

        <p className="mt-1.5 text-xs text-slate-400">
          PNG, JPG, WebP or GIF, up to 2 MB.
        </p>
        {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={AVATAR_ACCEPT}
          className="hidden"
          onChange={(event) => pick(event.target.files?.[0])}
        />
      </div>
    </div>
  );
}
