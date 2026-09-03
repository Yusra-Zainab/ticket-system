"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

import { cropCanvasToFile, type ScreenshotRect } from "@/lib/screenshot";

type Point = { x: number; y: number };

const DIM: CSSProperties = {
  position: "fixed",
  background: "rgba(15,23,42,0.55)",
};

/**
 * Shows the captured screen frame full-screen and lets the user drag a
 * rectangle over it (snipping-tool style). On release the frame is cropped to
 * the selection and handed to `onSelect` as a PNG File. Esc, right-click, or a
 * zero-size drag cancels.
 */
export default function ScreenshotRegionOverlay({
  source,
  onSelect,
  onCancel,
}: {
  source: HTMLCanvasElement;
  onSelect: (file: File) => void;
  onCancel: () => void;
}) {
  const dataUrl = useMemo(() => source.toDataURL("image/png"), [source]);

  const [start, setStart] = useState<Point | null>(null);
  const [current, setCurrent] = useState<Point | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewport, setViewport] = useState(() =>
    typeof window !== "undefined"
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 0, h: 0 },
  );

  useEffect(() => {
    const sync = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", sync);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("keydown", onKey);
      document.body.style.userSelect = previousUserSelect;
    };
  }, [onCancel]);

  // "contain" fit of the captured frame inside the viewport.
  const scale =
    viewport.w && viewport.h
      ? Math.min(viewport.w / source.width, viewport.h / source.height)
      : 1;
  const dispW = source.width * scale;
  const dispH = source.height * scale;
  const offX = (viewport.w - dispW) / 2;
  const offY = (viewport.h - dispH) / 2;

  const clamp = (point: Point): Point => ({
    x: Math.min(offX + dispW, Math.max(offX, point.x)),
    y: Math.min(offY + dispH, Math.max(offY, point.y)),
  });

  const beginDrag = (clientX: number, clientY: number) => {
    const origin = clamp({ x: clientX, y: clientY });
    setStart(origin);
    setCurrent(origin);

    const onMove = (event: MouseEvent) => {
      setCurrent(clamp({ x: event.clientX, y: event.clientY }));
    };

    const onUp = async (event: MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);

      const end = clamp({ x: event.clientX, y: event.clientY });
      setStart(null);
      setCurrent(null);

      const vw = Math.abs(origin.x - end.x);
      const vh = Math.abs(origin.y - end.y);

      if (vw < 4 || vh < 4) {
        onCancel();
        return;
      }

      const rect: ScreenshotRect = {
        x: (Math.min(origin.x, end.x) - offX) / scale,
        y: (Math.min(origin.y, end.y) - offY) / scale,
        width: vw / scale,
        height: vh / scale,
      };

      setBusy(true);
      try {
        const file = await cropCanvasToFile(source, rect);
        if (file) {
          onSelect(file);
        } else {
          onCancel();
        }
      } catch {
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
      className="fixed inset-0 z-[2147483000] cursor-crosshair select-none"
      style={{ background: "rgba(15,23,42,0.75)" }}
      onContextMenu={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onMouseDown={(event) => {
        if (busy) return;
        if (event.button !== 0) {
          onCancel();
          return;
        }
        event.preventDefault();
        beginDrag(event.clientX, event.clientY);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- transient data-URL overlay, not a page asset */}
      <img
        src={dataUrl}
        alt=""
        draggable={false}
        className="pointer-events-none"
        style={{
          position: "fixed",
          left: offX,
          top: offY,
          width: dispW,
          height: dispH,
        }}
      />

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
              background: "rgba(15,23,42,0.9)",
              color: "#fff",
              fontSize: 12,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.round(rect.width / scale)} × {Math.round(rect.height / scale)}
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
            background: "rgba(15,23,42,0.9)",
            color: "#fff",
            fontSize: 14,
          }}
        >
          {busy ? "Saving…" : "Drag to select an area · Esc to cancel"}
        </div>
      )}
    </div>,
    document.body,
  );
}
