"use client";

import { createContext, useContext, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DynamicProvider, useOnEvent, useUser, useGetWalletAccounts } from "@dynamic-labs-sdk/react-hooks";
import {
  createWaasWalletAccounts,
  getChainsMissingWaasWalletAccounts,
} from "@dynamic-labs-sdk/client/waas";
import type { WalletAccount } from "@dynamic-labs-sdk/client";
import { isEvmWalletAccount, type EvmWalletAccount } from "@dynamic-labs-sdk/evm";
import { CHAIN_ID } from "@/lib/constants";
import { dynamicClient } from "@/lib/dynamic";

interface WalletContextValue {
  evmAccount: EvmWalletAccount | null;
  loggedIn: boolean;
  /** Base only — this example has no network selector. */
  chainId: number;
}

const WalletContext = createContext<WalletContextValue>({
  evmAccount: null,
  loggedIn: false,
  chainId: CHAIN_ID,
});

export function useWallet() {
  return useContext(WalletContext);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Embedded (WaaS) wallet creation is not automatic — it has to be triggered
 * after authentication. `getChainsMissingWaasWalletAccounts()` is the correct
 * signal: guarding on `accounts.length === 0` can read a stale non-empty list
 * immediately after auth and silently skip creation.
 *
 * `useOnEvent` (never a raw `onEvent` call in a component) deduplicates the
 * subscription and cleans it up on unmount, including under Strict Mode.
 */
function WaasBootstrap() {
  useOnEvent({
    event: "userChanged",
    listener: async (user) => {
      if (!user) return;
      const missingChains = getChainsMissingWaasWalletAccounts();
      if (missingChains.length === 0) return;
      await createWaasWalletAccounts({ chains: missingChains });
    },
  });
  return null;
}

function WalletContextProvider({ children }: { children: ReactNode }) {
  const { data: user } = useUser();
  const { data: accounts = [] } = useGetWalletAccounts();
  // `useGetWalletAccounts` is typed as the chain-agnostic base account, while
  // the type guard is declared over the chain-specific `WalletAccount` union.
  const evmAccount =
    (accounts as WalletAccount[]).find(isEvmWalletAccount) ?? null;

  return (
    <WalletContext.Provider
      value={{ evmAccount, loggedIn: !!user, chainId: CHAIN_ID }}
    >
      {children}
    </WalletContext.Provider>
  );
}

/**
 * `QueryClientProvider` must sit OUTSIDE `DynamicProvider`: every hook in
 * `@dynamic-labs-sdk/react-hooks` is built on TanStack Query.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <DynamicProvider client={dynamicClient}>
        <WaasBootstrap />
        <WalletContextProvider>{children}</WalletContextProvider>
      </DynamicProvider>
    </QueryClientProvider>
  );
}
