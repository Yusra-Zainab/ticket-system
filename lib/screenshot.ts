/**
 * Region screenshot helper for the ticket attachment flows.
 *
 * Works like a snipping tool: the caller shows `ScreenshotRegionOverlay`, the
 * user drags a rectangle over the page, and `captureRegion` renders the page
 * and crops it to that rectangle, returning a PNG `File`.
 */

export type ScreenshotRect = {
  /** viewport-relative CSS pixels */
  x: number;
  y: number;
  width: number;
  height: number;
};

export async function captureRegion(
  rect: ScreenshotRect,
): Promise<File | null> {
  if (rect.width < 2 || rect.height < 2) {
    return null;
  }

  const { toCanvas } = await import("html-to-image");

  // Let the selection overlay finish unmounting so it isn't in the shot.
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await new Promise((resolve) => window.setTimeout(resolve, 30));

  const target = document.body;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  const full = await toCanvas(target, {
    backgroundColor: "#ffffff",
    pixelRatio,
    cacheBust: true,
  });

  // Map the viewport-relative selection into the rendered canvas.
  const layoutWidth = target.getBoundingClientRect().width || target.scrollWidth;
  const scale = full.width / layoutWidth;

  const sx = (rect.x + window.scrollX) * scale;
  const sy = (rect.y + window.scrollY) * scale;
  const sw = rect.width * scale;
  const sh = rect.height * scale;

  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(sw));
  out.height = Math.max(1, Math.round(sh));

  const context = out.getContext("2d");

  if (!context) {
    throw new Error("Could not crop the screenshot.");
  }

  context.drawImage(full, sx, sy, sw, sh, 0, 0, out.width, out.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    out.toBlob((result) => resolve(result), "image/png"),
  );

  if (!blob) {
    throw new Error("Could not encode the screenshot.");
  }

  return new globalThis.File([blob], `screenshot-${Date.now()}.png`, {
    type: "image/png",
  });
}
