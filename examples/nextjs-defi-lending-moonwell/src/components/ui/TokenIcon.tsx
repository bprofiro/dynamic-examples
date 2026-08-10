"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Token logos, named by lowercased asset symbol, mirroring how the Moonwell
// app resolves them. Any market without a file here falls back to a monogram.
const TINTS = [
  "bg-mw-blue-200 text-mw-blue-900",
  "bg-mw-green-100 text-mw-green-800",
  "bg-mw-base-bg text-mw-base-fg",
  "bg-mw-grey-100 text-mw-grey-600",
];

function tintFor(symbol: string) {
  const sum = [...symbol].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TINTS[sum % TINTS.length];
}

function monogram(symbol: string) {
  return symbol.replace(/^[a-z]+/, "").slice(0, 3) || symbol.slice(0, 3);
}

export function TokenIcon({
  symbol,
  size = 36,
  className,
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className={cn(
          "shrink-0 rounded-full flex items-center justify-center text-[11px] font-mono font-medium uppercase",
          tintFor(symbol),
          className,
        )}
      >
        {monogram(symbol)}
      </span>
    );
  }

  return (
    <Image
      src={`/tokens/${symbol.toLowerCase()}.svg`}
      alt={`${symbol} logo`}
      width={size}
      height={size}
      // SVGs are already vector — skip the optimizer rather than configuring
      // `dangerouslyAllowSVG` for local assets.
      unoptimized
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-full", className)}
    />
  );
}
