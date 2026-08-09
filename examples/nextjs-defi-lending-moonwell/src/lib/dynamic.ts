import { createDynamicClient, initializeClient } from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";

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
});

// Register extensions and initialize at module scope so both happen before any
// component renders. Extension functions take NO arguments. The browser guard
// is a Next.js concern only: "use client" modules still execute during SSR,
// where there is no wallet environment to initialize.
if (typeof window !== "undefined") {
  addEvmExtension();
  void initializeClient();
}
