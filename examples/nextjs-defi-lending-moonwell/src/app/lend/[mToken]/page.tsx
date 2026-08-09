"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { SupplyWithdrawForm } from "@/components/SupplyWithdrawForm";
import { Skeleton } from "@/components/ui/Skeleton";
import { BASESCAN_URL, MUSDC_ADDRESS } from "@/lib/constants";
import { useBalances, useMarkets } from "@/lib/hooks";
import { findMarketByMToken, formatApy, formatUsd } from "@/lib/moonwell";
import { useWallet } from "@/lib/providers";

export default function MarketDetailPage() {
  const params = useParams<{ mToken: string }>();
  const mTokenAddress = params.mToken;

  const { evmAccount } = useWallet();
  const { data: markets, isLoading: marketsLoading } = useMarkets();
  const { data: balances, isLoading: balancesLoading } = useBalances(
    evmAccount?.address,
  );

  // Only the native USDC market is actionable in this example.
  if (mTokenAddress.toLowerCase() !== MUSDC_ADDRESS.toLowerCase()) {
    notFound();
  }

  const market = markets && findMarketByMToken(markets, mTokenAddress);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        href="/lend"
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: "#606060" }}
      >
        <ChevronLeft className="h-4 w-4" />
        All markets
      </Link>

      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "#030303" }}>
          {market ? `${market.asset} market` : "USDC market"}
        </h1>
        <a
          href={`${BASESCAN_URL}/address/${mTokenAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono hover:underline"
          style={{ color: "#606060" }}
        >
          {mTokenAddress}
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Supply APY", value: market && formatApy(market.baseSupplyApy) },
          {
            label: "APY incl. rewards",
            value: market && formatApy(market.totalSupplyApr),
          },
          {
            label: "Total supplied",
            value: market && formatUsd(market.totalSupplyUsd),
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-white rounded-xl p-4"
            style={{ border: "1px solid #DADADA" }}
          >
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "#606060" }}>
              {label}
            </p>
            {marketsLoading || !value ? (
              <Skeleton className="h-6 w-20 mt-1" />
            ) : (
              <p className="text-lg font-semibold mt-1" style={{ color: "#030303" }}>
                {value}
              </p>
            )}
          </div>
        ))}
      </div>

      <BalanceDisplay
        balances={balances}
        isLoading={!!evmAccount && balancesLoading}
      />

      <SupplyWithdrawForm balances={balances} />
    </div>
  );
}
