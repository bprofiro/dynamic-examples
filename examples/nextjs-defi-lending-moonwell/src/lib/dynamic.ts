import { createDynamicClient, initializeClient } from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { BASE_RPC_URL, CHAIN_ID } from "@/lib/constants";

// `universalLink` defaults to `window.location.origin`, which does not exist
// while Next.js renders on the server — fall back to the dev origin so this
// module can be imported from a "use client" module graph without throwing.
const universalLink =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000";

export const dynamicClient = createDynamicClient({
  autoInitialize: false,
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID!,
  metadata: {
    name: "Moonwell Lending",
    universalLink,
  },
  transformers: {
    /**
     * The first network of a chain is the default for a fresh wallet, so
     * restricting the EVM list to Base makes Base the default — without this,
     * an environment that also has Ethereum enabled hands out wallets sitting
     * on chain 1 and every write fails until the user switches.
     *
     * Prepends the RPC override when one is configured, so both reads and the
     * broadcast go through it rather than Base's rate-limited public endpoint.
     */
    networksData: (networksData) =>
      networksData
        .filter(
          (network) =>
            network.chain !== "EVM" || Number(network.networkId) === CHAIN_ID,
        )
        .map((network) =>
          BASE_RPC_URL && Number(network.networkId) === CHAIN_ID
            ? {
                ...network,
                rpcUrls: {
                  ...network.rpcUrls,
                  http: [BASE_RPC_URL, ...network.rpcUrls.http],
                },
              }
            : network,
        ),
  },
});

// Register extensions and initialize at module scope so both happen before any
// component renders. Extension functions take NO arguments. The browser guard
// is a Next.js concern only: "use client" modules still execute during SSR,
// where there is no wallet environment to initialize.
if (typeof window !== "undefined") {
  addEvmExtension();
  void initializeClient();
}
