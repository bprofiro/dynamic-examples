"use client";

import Link from "next/link";
import { MUSDC_ADDRESS } from "@/lib/constants";
import { formatApy, formatUsd, type Market } from "@/lib/moonwell";

/**
 * One row of the market list. Every non-deprecated market is listed with live
 * rates; only the USDC market is actionable in this example, so the rest render
 * without a call to action.
 */
export function MarketRow({ market }: { market: Market }) {
  const isActionable =
    market.mTokenAddress.toLowerCase() === MUSDC_ADDRESS.toLowerCase();

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-5 items-center gap-3 px-4 py-3 bg-white"
      style={{ borderBottom: "1px solid #DADADA" }}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "#030303" }}>
          {market.asset}
        </p>
        <p className="text-xs truncate" style={{ color: "#606060" }}>
          {market.mToken}
        </p>
      </div>

      <div className="text-right sm:text-left">
        <p className="text-[10px] uppercase tracking-wide sm:hidden" style={{ color: "#606060" }}>
          Supply APY
        </p>
        <p className="text-sm font-semibold" style={{ color: "#030303" }}>
          {formatApy(market.baseSupplyApy)}
        </p>
      </div>

      <div className="hidden sm:block">
        <p className="text-sm" style={{ color: "#606060" }}>
          {formatApy(market.totalSupplyApr)}
        </p>
      </div>

      <div className="hidden sm:block">
        <p className="text-sm" style={{ color: "#606060" }}>
          {formatUsd(market.totalSupplyUsd)}
        </p>
      </div>

      <div className="col-span-2 sm:col-span-1 sm:text-right">
        {isActionable ? (
          <Link
            href={`/lend/${market.mTokenAddress}`}
            className="inline-block px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
            style={{ background: "#4779FF" }}
          >
            Supply
          </Link>
        ) : (
          <span className="text-xs" style={{ color: "#606060" }}>
            View only
          </span>
        )}
      </div>
    </div>
  );
}
