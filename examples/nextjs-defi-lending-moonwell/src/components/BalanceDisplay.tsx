"use client";

import { formatUnits } from "viem";
import { MTOKEN_DECIMALS, USDC_DECIMALS } from "@/lib/constants";
import type { Balances } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/Skeleton";

function usdc(value: bigint) {
  return `${Number(formatUnits(value, USDC_DECIMALS)).toFixed(6)} USDC`;
}

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
      <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #DADADA" }}>
        <p className="text-sm font-medium" style={{ color: "#606060" }}>
          Wallet balance
        </p>
        {isLoading ? (
          <Skeleton className="h-8 w-32 mt-2" />
        ) : (
          <p className="text-2xl font-semibold mt-2" style={{ color: "#030303" }}>
            {balances ? usdc(balances.walletUsdc) : "—"}
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #DADADA" }}>
        <p className="text-sm font-medium" style={{ color: "#606060" }}>
          Supplied
        </p>
        {isLoading ? (
          <Skeleton className="h-8 w-32 mt-2" />
        ) : (
          <>
            <p className="text-2xl font-semibold mt-2" style={{ color: "#030303" }}>
              {balances ? usdc(balances.suppliedUsdc) : "—"}
            </p>
            <p className="text-xs mt-1" style={{ color: "#606060" }}>
              {balances
                ? `${formatUnits(balances.mTokenBalance, MTOKEN_DECIMALS)} mUSDC`
                : "Sign in to see your position"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
