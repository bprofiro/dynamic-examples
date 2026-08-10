"use client";

import type { Balances } from "@/lib/hooks";
import { formatUsdcAmount } from "@/lib/moonwell";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Wallet balance next to the supplied balance. The supplied figure is derived
 * from the mToken balance and the current exchange rate, so it grows with
 * accrued interest without any extra bookkeeping.
 */
export function BalanceDisplay({
  balances,
  isLoading,
}: {
  balances?: Balances;
  isLoading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-mw-grey-100 p-4 space-y-2">
        <p className="text-sm text-mw-grey-400">Wallet balance</p>
        {isLoading ? (
          <Skeleton className="h-7 w-32" />
        ) : (
          <p className="tabular text-2xl">
            {balances ? formatUsdcAmount(balances.walletUsdc) : "—"}
            <span className="text-mw-grey-400 text-base ml-1.5">USDC</span>
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-mw-grey-100 p-4 space-y-2">
        <p className="text-sm text-mw-grey-400">Supplied</p>
        {isLoading ? (
          <Skeleton className="h-7 w-32" />
        ) : (
          <>
            <p className="tabular text-2xl">
              {balances ? formatUsdcAmount(balances.suppliedUsdc) : "—"}
              <span className="text-mw-grey-400 text-base ml-1.5">USDC</span>
            </p>
            {!balances && (
              <p className="text-xs text-mw-grey-400">
                Sign in to see your position
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
