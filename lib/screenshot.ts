/**
 * Screen-capture helper for the ticket attachment flows.
 *
 * Opens the browser's native "Choose what to share" picker (the same UI Zoom
 * or Google Meet show for screen sharing), lets the user pick a screen, window
 * or tab, grabs a single frame and hands it back as a PNG `File`.
 *
 * Returns `null` when the user dismisses the picker without choosing anything
 * (so callers can stay quiet instead of showing an error).
 */
export async function captureScreenSelection(): Promise<File | null> {
  const media =
    typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;

  if (!media?.getDisplayMedia) {
    throw new Error("Screen capture is not supported in this browser.");
  }

  let stream: MediaStream;

  try {
    stream = await media.getDisplayMedia({
      video: { frameRate: 1 },
      audio: false,
    });
  } catch (error) {
    // The user closed the picker or denied permission - not a real failure.
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

    // Give the compositor one frame to actually paint the shared surface.
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context || !canvas.width || !canvas.height) {
      throw new Error("Could not read the captured frame.");
    }

    context.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), "image/png"),
    );

    if (!blob) {
      throw new Error("Could not encode the screenshot.");
    }

    return new globalThis.File([blob], `screenshot-${Date.now()}.png`, {
      type: "image/png",
    });
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}
