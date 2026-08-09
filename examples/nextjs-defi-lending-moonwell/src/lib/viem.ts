import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

/** Read-only Base client. Writes go through the Dynamic wallet client. */
export const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});
