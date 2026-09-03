"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

import type { ScreenshotRect } from "@/lib/screenshot";

type Point = { x: number; y: number };

const DIM: CSSProperties = {
  position: "fixed",
  background: "rgba(15,23,42,0.45)",
};

/**
 * Full-viewport "snipping tool" overlay. The user drags a rectangle over the
 * page; on release the selected region (viewport-relative CSS pixels) is
 * handed to `onSelect`. Esc, right-click, or a zero-size drag cancels.
 */
export default function ScreenshotRegionOverlay({
  onSelect,
  onCancel,
}: {
  onSelect: (rect: ScreenshotRect) => void;
  onCancel: () => void;
}) {
  const [start, setStart] = useState<Point | null>(null);
  const [current, setCurrent] = useState<Point | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.userSelect = previousUserSelect;
    };
  }, [onCancel]);

  const beginDrag = (clientX: number, clientY: number) => {
    const origin = { x: clientX, y: clientY };
    setStart(origin);
    setCurrent(origin);

    const onMove = (event: MouseEvent) => {
      setCurrent({ x: event.clientX, y: event.clientY });
    };
    const onUp = (event: MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);

      const rect: ScreenshotRect = {
        x: Math.min(origin.x, event.clientX),
        y: Math.min(origin.y, event.clientY),
        width: Math.abs(origin.x - event.clientX),
        height: Math.abs(origin.y - event.clientY),
      };

      setStart(null);
      setCurrent(null);

      if (rect.width > 4 && rect.height > 4) {
        onSelect(rect);
      } else {
        onCancel();
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const rect: ScreenshotRect | null =
    start && current
      ? {
          x: Math.min(start.x, current.x),
          y: Math.min(start.y, current.y),
          width: Math.abs(start.x - current.x),
          height: Math.abs(start.y - current.y),
        }
      : null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483000] cursor-crosshair"
      style={{ background: rect ? "transparent" : "rgba(15,23,42,0.45)" }}
      onContextMenu={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onMouseDown={(event) => {
        if (event.button !== 0) {
          onCancel();
          return;
        }
        event.preventDefault();
        beginDrag(event.clientX, event.clientY);
      }}
    >
      {rect ? (
        <>
          <div style={{ ...DIM, left: 0, top: 0, width: "100vw", height: rect.y }} />
          <div
            style={{
              ...DIM,
              left: 0,
              top: rect.y + rect.height,
              width: "100vw",
              bottom: 0,
            }}
          />
          <div style={{ ...DIM, left: 0, top: rect.y, width: rect.x, height: rect.height }} />
          <div
            style={{
              ...DIM,
              left: rect.x + rect.width,
              top: rect.y,
              right: 0,
              height: rect.height,
            }}
          />
          <div
            className="pointer-events-none"
            style={{
              position: "fixed",
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
              border: "2px solid #38bdf8",
              boxShadow: "0 0 0 1px rgba(15,23,42,0.35)",
            }}
          />
          <div
            className="pointer-events-none"
            style={{
              position: "fixed",
              left: rect.x,
              top: Math.max(4, rect.y - 24),
              padding: "2px 8px",
              borderRadius: 6,
              background: "rgba(15,23,42,0.85)",
              color: "#fff",
              fontSize: 12,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.round(rect.width)} × {Math.round(rect.height)}
          </div>
        </>
      ) : (
        <div
          className="pointer-events-none"
          style={{
            position: "fixed",
            left: "50%",
            top: 24,
            transform: "translateX(-50%)",
            padding: "8px 16px",
            borderRadius: 9999,
            background: "rgba(15,23,42,0.85)",
            color: "#fff",
            fontSize: 14,
          }}
        >
          Drag to select an area to capture · Esc to cancel
        </div>
      )}
    </div>,
    document.body,
  );
}
