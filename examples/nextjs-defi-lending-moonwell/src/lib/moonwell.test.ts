import { describe, expect, it } from "vitest";
import {
  filterActiveMarkets,
  findMarketByMToken,
  formatApy,
  formatUsd,
  parseMarketsResponse,
  underlyingFromMTokens,
} from "@/lib/moonwell";

/**
 * Trimmed from a real `GET https://api.moonwell.fi/v1/markets?chainId=8453`
 * response. It deliberately includes both markets that report the `mUSDC`
 * symbol — native USDC (active) and legacy USDbC (deprecated).
 */
const API_FIXTURE = {
  success: true,
  data: [
    {
      asset: "USDC",
      assetAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      mToken: "mUSDC",
      mTokenAddress: "0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22",
      deprecated: false,
      baseSupplyApy: 3.6680556933,
      baseBorrowApy: 5.1234,
      totalSupplyApr: 3.9815878291,
      totalBorrowApr: 4.5,
      totalSupplyUsd: 15689140.494015666,
      totalBorrowsUsd: 12000000,
      liquidityUsd: 3689140.49,
      utilization: 0.76,
      collateralFactor: 0.85,
    },
    {
      asset: "USDbC",
      assetAddress: "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca",
      mToken: "mUSDC",
      mTokenAddress: "0x703843C3379b52F9FF486c9f5892218d2a065cC8",
      deprecated: true,
      baseSupplyApy: 0,
      baseBorrowApy: 0,
      totalSupplyApr: 0,
      totalBorrowApr: 0,
      totalSupplyUsd: 8012.9146988938,
      totalBorrowsUsd: 0,
      liquidityUsd: 8012.91,
      utilization: 0,
      collateralFactor: 0,
    },
    {
      asset: "WETH",
      assetAddress: "0x4200000000000000000000000000000000000006",
      mToken: "mWETH",
      mTokenAddress: "0x628ff693426583D9a7FB391E54366292F509D457",
      deprecated: false,
      baseSupplyApy: 1.2049,
      baseBorrowApy: 2.5,
      totalSupplyApr: 1.4,
      totalBorrowApr: 2.9,
      totalSupplyUsd: 42000000,
      totalBorrowsUsd: 20000000,
      liquidityUsd: 22000000,
      utilization: 0.47,
      collateralFactor: 0.81,
    },
  ],
  meta: {
    command: "markets",
    chain: "eip155:8453",
    timestamp: "2026-08-09T21:22:43.908Z",
  },
};

describe("parseMarketsResponse", () => {
  it("returns the market list for a well-formed payload", () => {
    const markets = parseMarketsResponse(API_FIXTURE);
    expect(markets).toHaveLength(3);
    expect(markets[0].asset).toBe("USDC");
  });

  it("rejects a payload where success is false", () => {
    expect(() =>
      parseMarketsResponse({ ...API_FIXTURE, success: false }),
    ).toThrow(/success/i);
  });

  it("rejects a payload whose data is not an array", () => {
    expect(() => parseMarketsResponse({ success: true, data: null })).toThrow(
      /data/i,
    );
  });

  it("rejects a market that is missing required fields", () => {
    expect(() =>
      parseMarketsResponse({
        success: true,
        data: [{ asset: "USDC", mToken: "mUSDC" }],
      }),
    ).toThrow(/market/i);
  });

  it("rejects a non-object payload", () => {
    expect(() => parseMarketsResponse(null)).toThrow();
    expect(() => parseMarketsResponse("nope")).toThrow();
  });
});

describe("filterActiveMarkets", () => {
  it("drops deprecated markets", () => {
    const active = filterActiveMarkets(parseMarketsResponse(API_FIXTURE));
    expect(active.map((m) => m.asset)).toEqual(["USDC", "WETH"]);
  });

  it("drops the deprecated USDbC market even though it shares the mUSDC symbol", () => {
    const active = filterActiveMarkets(parseMarketsResponse(API_FIXTURE));
    const mUsdcMarkets = active.filter((m) => m.mToken === "mUSDC");
    expect(mUsdcMarkets).toHaveLength(1);
    expect(mUsdcMarkets[0].mTokenAddress).toBe(
      "0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22",
    );
  });
});

describe("findMarketByMToken", () => {
  const markets = parseMarketsResponse(API_FIXTURE);

  it("keys markets by mToken address, not by symbol", () => {
    const usdc = findMarketByMToken(
      markets,
      "0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22",
    );
    const usdbc = findMarketByMToken(
      markets,
      "0x703843C3379b52F9FF486c9f5892218d2a065cC8",
    );
    expect(usdc?.asset).toBe("USDC");
    expect(usdbc?.asset).toBe("USDbC");
  });

  it("matches case-insensitively", () => {
    const market = findMarketByMToken(
      markets,
      "0xedc817a28e8b93b03976fbd4a3ddbc9f7d176c22",
    );
    expect(market?.asset).toBe("USDC");
  });

  it("returns undefined for an unknown address", () => {
    expect(findMarketByMToken(markets, "0xdead")).toBeUndefined();
  });
});

describe("underlyingFromMTokens", () => {
  // mTokens carry 8 decimals; the USDC exchange rate is scaled by
  // 1e(10 + 6) = 1e16, so 1 mUSDC at a rate of 2.31e14 is ~0.0231 USDC.
  const RATE = 231_000_000_000_000n;

  it("converts an 8-decimal mToken balance into 6-decimal USDC", () => {
    expect(underlyingFromMTokens(100_000_000n, RATE)).toBe(23_100n);
  });

  it("scales linearly", () => {
    expect(underlyingFromMTokens(4_329_004_329n, RATE)).toBe(999_999n);
  });

  it("returns zero for a zero balance", () => {
    expect(underlyingFromMTokens(0n, RATE)).toBe(0n);
  });

  it("returns zero for a zero rate", () => {
    expect(underlyingFromMTokens(100_000_000n, 0n)).toBe(0n);
  });

  it("rounds down rather than up", () => {
    // 1 mToken unit at this rate is 0.000231 of an underlying unit.
    expect(underlyingFromMTokens(1n, RATE)).toBe(0n);
    expect(underlyingFromMTokens(4_329n, RATE)).toBe(0n);
    expect(underlyingFromMTokens(4_330n, RATE)).toBe(1n);
  });
});

describe("formatApy", () => {
  it("treats API values as percentages already", () => {
    expect(formatApy(4.3861606852)).toBe("4.39%");
    expect(formatApy(3.6680556933)).toBe("3.67%");
  });

  it("formats zero and small values", () => {
    expect(formatApy(0)).toBe("0.00%");
    expect(formatApy(0.004)).toBe("0.00%");
  });

  it("falls back for non-finite input", () => {
    expect(formatApy(Number.NaN)).toBe("—");
  });
});

describe("formatUsd", () => {
  it("abbreviates millions and thousands", () => {
    expect(formatUsd(15689140.494015666)).toBe("$15.69M");
    expect(formatUsd(8012.9146988938)).toBe("$8.01K");
  });

  it("keeps small amounts unabbreviated", () => {
    expect(formatUsd(42.5)).toBe("$42.50");
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("abbreviates billions", () => {
    expect(formatUsd(2_500_000_000)).toBe("$2.50B");
  });

  it("falls back for non-finite input", () => {
    expect(formatUsd(Number.NaN)).toBe("—");
  });
});
