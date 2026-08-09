import { cn } from "@/lib/utils";

// Moonwell renders a token logo here. Those are third-party brand marks, so
// this example draws a monogram instead of vendoring or hotlinking them.
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

export function TokenIcon({
  symbol,
  className,
}: {
  symbol: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-mono font-medium uppercase",
        tintFor(symbol),
        className,
      )}
    >
      {symbol.replace(/^[a-z]+/, "").slice(0, 3) || symbol.slice(0, 3)}
    </span>
  );
}
