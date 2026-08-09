"use client";

import { MarketRow } from "@/components/MarketRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMarkets } from "@/lib/hooks";

export default function LendPage() {
  const { data: markets, isLoading, error } = useMarkets();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "#030303" }}>
          Lend
        </h1>
        <p className="text-sm mt-1" style={{ color: "#606060" }}>
          Supply assets to Moonwell on Base and earn interest. Rates are live
          from the Moonwell API.
        </p>
      </div>

      <section className="rounded-xl overflow-hidden" style={{ border: "1px solid #DADADA" }}>
        <div
          className="hidden sm:grid grid-cols-5 gap-3 px-4 py-2 text-[10px] font-medium uppercase tracking-wide"
          style={{ background: "#F9F9F9", color: "#606060", borderBottom: "1px solid #DADADA" }}
        >
          <span>Market</span>
          <span>Supply APY</span>
          <span>APY incl. rewards</span>
          <span>Total supplied</span>
          <span className="text-right">Action</span>
        </div>

        {isLoading ? (
          <div className="divide-y" style={{ borderColor: "#DADADA" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3 bg-white">
                <Skeleton className="h-6 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-sm text-red-600">
            Could not load markets: {error.message}
          </div>
        ) : (
          markets?.map((market) => (
            <MarketRow key={market.mTokenAddress} market={market} />
          ))
        )}
      </section>

      {markets && (
        <p className="text-xs" style={{ color: "#606060" }}>
          {markets.length} active markets. Deprecated markets are filtered out —
          including the legacy USDbC market, which reports the same{" "}
          <code>mUSDC</code> symbol as native USDC.
        </p>
      )}
    </div>
  );
}
