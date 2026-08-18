"use client";

import {
  Error403Screen,
  Error404Screen,
  Error502Screen,
} from "@/components/errors/ErrorScreens";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error.message.toLowerCase();
  if (
    message.includes("403") ||
    message.includes("forbidden") ||
    message.includes("permission")
  ) {
    return <Error403Screen />;
  }
  if (message.includes("404") || message.includes("not found")) {
    return <Error404Screen />;
  }
  return (
    <Error502Screen message={error.message || undefined} onRetry={reset} />
  );
}
