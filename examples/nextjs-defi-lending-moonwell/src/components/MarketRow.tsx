"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { MUSDC_ADDRESS } from "@/lib/constants";
import {
  assetDisplayName,
  formatApy,
  formatUsd,
  type Market,
} from "@/lib/moonwell";

/**
 * One row of the market list, laid out like the moonwell.fi markets table:
 * token monogram + symbol over its full name, network chip, then monospaced
 * figures and an outlined action.
 *
 * Every non-deprecated market is listed with live rates; only the USDC market
 * is actionable in this example, so the rest have no call to action.
 */
export function MarketRow({ market }: { market: Market }) {
  const isActionable =
    market.mTokenAddress.toLowerCase() === MUSDC_ADDRESS.toLowerCase();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,2fr)_7rem_minmax(0,1fr)_minmax(0,1fr)_8.5rem] items-center gap-4 py-5 border-b border-mw-grey-100">
      <div className="flex items-center gap-3 min-w-0">
        <TokenIcon symbol={market.asset} />
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{market.asset}</p>
          <p className="text-xs text-mw-grey-400 truncate">
            {assetDisplayName(market.asset)}
          </p>
        </div>
      </div>

      <div className="hidden sm:block">
        <Badge color="base">Base</Badge>
      </div>

      <div className="text-right sm:text-left">
        <p className="text-[10px] uppercase tracking-wide text-mw-grey-400 sm:hidden">
          Supply APY
        </p>
        <p className="tabular text-sm">{formatApy(market.baseSupplyApy)}</p>
      </div>

      <div className="hidden sm:block">
        <p className="tabular text-sm text-mw-grey-400">
          {formatUsd(market.totalSupplyUsd)}
        </p>
      </div>

      <div className="col-span-2 sm:col-span-1 sm:justify-self-end">
        {isActionable ? (
          <Link
            href={`/lend/${market.mTokenAddress}`}
            className="inline-block font-mono text-sm py-1 px-3 rounded-lg border border-mw-grey-200 text-mw-black hover:border-mw-blue hover:text-mw-blue transition-colors"
          >
            View Market
          </Link>
        ) : (
          <span className="font-mono text-sm text-mw-grey-300">—</span>
        )}
      </div>
    </div>
  );
}
