/**
 * Screenshot helper for the ticket attachment flows.
 *
 * Two-step "snipping tool" flow:
 *  1. `captureDisplayFrame()` opens the browser's native "Choose what to share"
 *     picker (screen / window / tab), grabs one frame and returns it as a canvas.
 *  2. `ScreenshotRegionOverlay` shows that frame and lets the user drag a
 *     rectangle; `cropCanvasToFile()` crops the frame to that rectangle.
 */

export type ScreenshotRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Opens `getDisplayMedia`'s picker, captures a single frame of the chosen
 * surface and returns it as a canvas. Returns `null` if the user dismisses
 * the picker.
 */
export async function captureDisplayFrame(): Promise<HTMLCanvasElement | null> {
  const media =
    typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;

  if (!media?.getDisplayMedia) {
    throw new Error("Screen capture is not supported in this browser.");
  }

  let stream: MediaStream;

  try {
    stream = await media.getDisplayMedia({ video: true, audio: false });
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "NotAllowedError" || error.name === "AbortError")
    ) {
      return null;
    }
    throw error;
  }

  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;

    await video.play();

    if (!video.videoWidth) {
      await new Promise<void>((resolve) => {
        video.addEventListener("loadedmetadata", () => resolve(), {
          once: true,
        });
      });
    }

    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context || !canvas.width || !canvas.height) {
      throw new Error("Could not read the captured frame.");
    }

    context.drawImage(video, 0, 0);

    return canvas;
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

/**
 * Crops `source` to `rect` (in source-canvas pixels) and returns a PNG File.
 */
export async function cropCanvasToFile(
  source: HTMLCanvasElement,
  rect: ScreenshotRect,
): Promise<File | null> {
  const x = Math.max(0, Math.round(rect.x));
  const y = Math.max(0, Math.round(rect.y));
  const width = Math.min(source.width - x, Math.round(rect.width));
  const height = Math.min(source.height - y, Math.round(rect.height));

  if (width < 2 || height < 2) {
    return null;
  }

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;

  const context = out.getContext("2d");

  if (!context) {
    throw new Error("Could not crop the screenshot.");
  }

  context.drawImage(source, x, y, width, height, 0, 0, width, height);

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
