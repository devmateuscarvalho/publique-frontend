"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export function LibraryPhoto({
  src,
  emptyLabel,
  className,
}: {
  src?: string;
  emptyLabel: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState("");
  const show = Boolean(src) && failedSrc !== src;

  return (
    <span className={cn("relative block overflow-hidden bg-muted", className)}>
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailedSrc(src ?? "")}
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center px-2 text-center text-xs font-medium text-ink/60">
          {emptyLabel}
        </span>
      )}
    </span>
  );
}
