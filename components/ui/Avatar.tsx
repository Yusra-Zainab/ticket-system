import { cn, initials } from "@/lib/utils";

/**
 * Circular avatar. Renders the uploaded photo when `src` is a non-empty
 * URL (`/api/avatars/{id}` or an external one), otherwise the person's
 * initials. Pass `src` everywhere a user/resource/client is shown so a
 * profile picture appears without each call site re-implementing the
 * `<img>` fallback.
 */
export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const hasImage = typeof src === "string" && src.trim().length > 0;

  return (
    <span
      aria-label={name}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-xs font-bold text-sky-700",
        className,
      )}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={name}
          className="size-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
