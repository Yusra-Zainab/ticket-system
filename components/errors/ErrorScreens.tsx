"use client";

import Link from "next/link";
import Image from "next/image";

export function Error403Screen() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-white px-4">
      <div className="relative z-10 text-center">
        <div className="relative mx-auto aspect-4/3 w-full max-w-xl">
          <Image
            src="/images/403.png"
            alt="A cat tangled in a ball of yarn, illustrating a 403 error"
            fill
            className="object-contain"
            priority
          />
        </div>
        <p
          className="mt-4 w-screen px-8 text-[24px] font-normal leading-8 text-[#344054]"
        >
          You don&apos;t have permission to view this page. This might be because the content is private, or you need to be logged in to access it.
        </p>
      </div>
    </main>
  );
}

export function Error404Screen() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-white px-4">
      <div className="relative z-10 w-full max-w-2xl text-center">
        <div className="relative mx-auto aspect-4/3 w-full max-w-md">
          <Image
            src="/images/404.png"
            alt="A cat tangled in a ball of yarn, illustrating a 404 error"
            fill
            className="object-contain"
            priority
          />
        </div>
        <p className="mx-auto mt-4 max-w-xl text-[24px] font-normal leading-8 text-[#344054]">
          The page you are looking for doesn&apos;t exist
        </p>
        <Link className="button-primary mt-6 inline-flex" href="/">
          Return to dashboard
        </Link>
      </div>
    </main>
  );
}

export function Error502Screen({
  message = "We&apos;re experiencing a temporary technical issue on our end. This isn&apos;t your fault, and our team has been notified and is working to fix it as quickly as possible.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-white px-4">
      <div className="relative z-10 text-center">
        <div className="relative mx-auto aspect-4/3 w-full max-w-xl">
          <Image
            src="/images/502.png"
            alt="A cat tangled in a ball of yarn, illustrating a 502 server error"
            fill
            className="object-contain"
            priority
          />
        </div>
        <p className="mt-4 w-screen px-8 text-[24px] font-normal leading-8 text-[#344054]">
          {message}
        </p>
        {onRetry && (
          <button className="button-primary mt-6" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </main>
  );
}
