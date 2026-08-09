import { cn } from "@/lib/utils";

const COLORS = {
  base: "bg-mw-base-bg text-mw-base-fg",
  green: "bg-mw-green-100 text-mw-green-800",
  grey: "bg-mw-grey-100 text-mw-grey-600",
} as const;

/** Small chip, matching the network/market-type badges in the Moonwell app. */
export function Badge({
  color = "grey",
  children,
  className,
}: {
  color?: keyof typeof COLORS;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block text-xs py-1 px-2 rounded-md",
        COLORS[color],
        className,
      )}
    >
      {children}
    </span>
  );
}
