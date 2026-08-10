/** Base mainnet. This example is single-network by design — no chain selector. */
export const CHAIN_ID = 8453;

/**
 * Moonwell's public markets endpoint. It defaults to Base, but the chain is
 * passed explicitly so the URL documents itself.
 */
export const MARKETS_API = "https://api.moonwell.fi/v1/markets?chainId=8453";

/** Native USDC on Base (6 decimals). */
export const USDC_ADDRESS =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

/**
 * Moonwell's mToken for the native USDC market (8 decimals).
 *
 * Two markets report the `mUSDC` symbol: this one and the deprecated USDbC
 * market at 0x703843C3379b52F9FF486c9f5892218d2a065cC8. Always identify a
 * market by its mToken address, never by symbol.
 */
export const MUSDC_ADDRESS =
  "0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22" as const;

export const USDC_DECIMALS = 6;
export const MTOKEN_DECIMALS = 8;

export const BASESCAN_URL = "https://basescan.org";

/**
 * Optional RPC override. Base's public endpoint rate-limits browser traffic and
 * answers with 403 under load, which surfaces as a failed broadcast rather than
 * a failed read. Point this at your own provider for anything beyond a demo.
 */
export const BASE_RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || undefined;
