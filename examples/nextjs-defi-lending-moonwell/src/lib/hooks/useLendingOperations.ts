"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Account } from "viem";
import {
  getActiveNetworkId,
  isProgrammaticNetworkSwitchAvailable,
  switchActiveNetwork,
} from "@dynamic-labs-sdk/client";
import { createWalletClientForWalletAccount } from "@dynamic-labs-sdk/evm/viem";
import type { EvmWalletAccount } from "@dynamic-labs-sdk/evm";
import { ERC20_ABI, MTOKEN_ABI } from "@/lib/ABIs";
import { CHAIN_ID, MUSDC_ADDRESS, USDC_ADDRESS } from "@/lib/constants";
import { balancesQueryKey } from "@/lib/hooks/useBalances";
import { publicClient } from "@/lib/viem";
import { formatErrorMessage } from "@/lib/utils";

export type TxPhase =
  | "idle"
  | "switching"
  | "approving"
  | "pending"
  | "success"
  | "error";

export interface TxState {
  phase: TxPhase;
  hash?: `0x${string}`;
  error?: string;
}

const IDLE: TxState = { phase: "idle" };

/**
 * Compound v2 markets answer some failures with a non-zero return code instead
 * of reverting, so a transaction can succeed on-chain while doing nothing.
 * Simulating first exposes that code — anything but 0 is a refusal.
 */
function assertNoErrorCode(result: unknown, action: string) {
  if (typeof result === "bigint" && result !== 0n) {
    throw new Error(
      `Moonwell rejected the ${action} with error code ${result}. ` +
        `See https://docs.moonwell.fi for what each code means.`,
    );
  }
}

/**
 * Blocks until the allowance is observable as at least `amount`.
 *
 * A mined approval is not the same as a readable one. `waitForTransactionReceipt`
 * proves one node saw the transaction; the very next `simulateContract` can be
 * served by a node a block behind, which still reads the old allowance and
 * reverts `mint` with "ERC20: transfer amount exceeds allowance" — an alarming
 * error for a transaction that is actually fine.
 */
async function waitForAllowance(
  owner: `0x${string}`,
  amount: bigint,
  attempts = 10,
  delayMs = 500,
) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const allowance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner, MUSDC_ADDRESS],
    });
    if (allowance >= amount) return;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(
    "Approval confirmed, but the new allowance is not visible on the RPC yet. Try the supply again.",
  );
}

export function useLendingOperations(evmAccount: EvmWalletAccount | null) {
  const queryClient = useQueryClient();
  const [tx, setTx] = useState<TxState>(IDLE);

  const address = evmAccount?.address as `0x${string}` | undefined;

  /**
   * Puts the wallet on Base before anything is signed.
   *
   * An embedded wallet does not start on Base just because Base is enabled — it
   * opens on whatever network the environment considers default. And
   * `createWalletClientForWalletAccount` derives its chain from the wallet's
   * *current* network, so the switch has to happen before the client is built,
   * not after.
   *
   * Embedded wallets switch programmatically with no user prompt. An external
   * wallet may refuse, so the capability is checked rather than assumed.
   */
  const getWalletClient = useCallback(
    async (onSwitchStart?: () => void) => {
      if (!evmAccount) throw new Error("Connect a wallet first");

      const { networkId } = await getActiveNetworkId({
        walletAccount: evmAccount,
      });

      if (Number(networkId) !== CHAIN_ID) {
        if (!isProgrammaticNetworkSwitchAvailable({ walletAccount: evmAccount })) {
          throw new Error(
            `This wallet is on chain ${networkId} and cannot switch networks programmatically. Switch to Base (${CHAIN_ID}) in your wallet, then try again.`,
          );
        }
        onSwitchStart?.();
        await switchActiveNetwork({
          networkId: String(CHAIN_ID),
          walletAccount: evmAccount,
        });
      }

      const walletClient = await createWalletClientForWalletAccount({
        walletAccount: evmAccount,
      });

      // Backstop: if the switch silently failed we would otherwise sign against
      // the wrong chain's contracts.
      if (walletClient.chain?.id !== CHAIN_ID) {
        throw new Error(
          `Wallet is still on chain ${walletClient.chain?.id ?? "unknown"} after switching to Base (${CHAIN_ID}).`,
        );
      }

      // The embedded wallet signs locally, which viem models as a `local`
      // account. A `json-rpc` account means the SDK fell back to proxying
      // through a provider that cannot sign — the transaction would be
      // forwarded to a public RPC, which holds no keys and answers
      // `eth_sendTransaction` with "rpc method is unsupported". Failing here
      // names the cause instead of surfacing that as a network error.
      if (walletClient.account?.type !== "local") {
        throw new Error(
          `Selected wallet cannot sign locally (viem account type "${walletClient.account?.type ?? "unknown"}"). This example expects a Dynamic embedded wallet.`,
        );
      }
      return walletClient;
    },
    [evmAccount],
  );

  const reset = useCallback(() => setTx(IDLE), []);

  /**
   * Runs one simulate → write → wait cycle and keeps `tx` in step with it.
   * `phase` is the caller's label for the in-flight state so the UI can tell
   * an approval apart from the supply that follows it.
   *
   * The simulate callback is handed the wallet's *account object*, not its
   * address. `writeContract` prefers the account carried on the simulated
   * request over the one on the client, and an address string parses into a
   * `json-rpc` account — which would send `eth_sendTransaction` to the RPC
   * instead of signing locally with the embedded wallet.
   */
  const run = useCallback(
    async (
      phase: Exclude<TxPhase, "idle" | "switching" | "success" | "error">,
      action: string,
      simulate: (account: Account) => Promise<{
        request: Parameters<
          Awaited<ReturnType<typeof getWalletClient>>["writeContract"]
        >[0];
        result: unknown;
      }>,
      /** Runs after the receipt, while `phase` is still on screen. */
      afterConfirm?: () => Promise<void>,
    ) => {
      if (!address) {
        setTx({ phase: "error", error: "Connect a wallet first" });
        return false;
      }
      setTx({ phase });
      try {
        // Only surfaces the switching phase when a switch is actually needed, so
        // the common same-chain path does not flash it.
        const walletClient = await getWalletClient(() =>
          setTx({ phase: "switching" }),
        );
        setTx({ phase });

        const { request, result } = await simulate(walletClient.account);
        assertNoErrorCode(result, action);

        const hash = await walletClient.writeContract(request);
        setTx({ phase, hash });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          throw new Error(`${action} transaction reverted`);
        }

        await afterConfirm?.();

        await queryClient.invalidateQueries({
          queryKey: balancesQueryKey(address),
        });
        setTx({ phase: "success", hash });
        return true;
      } catch (error) {
        setTx({ phase: "error", error: formatErrorMessage(error) });
        return false;
      }
    },
    [address, getWalletClient, queryClient],
  );

  /**
   * Approves the mToken to spend `amount` USDC, and does not resolve until the
   * new allowance is readable — the supply that follows simulates against it.
   */
  const approve = useCallback(
    (amount: bigint) =>
      run(
        "approving",
        "approval",
        async (account) =>
          publicClient.simulateContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [MUSDC_ADDRESS, amount],
            account,
          }),
        async () => {
          if (address) await waitForAllowance(address, amount);
        },
      ),
    [run, address],
  );

  /** Supplies USDC and receives mUSDC. */
  const supply = useCallback(
    (amount: bigint) =>
      run("pending", "supply", async (account) =>
        publicClient.simulateContract({
          address: MUSDC_ADDRESS,
          abi: MTOKEN_ABI,
          functionName: "mint",
          args: [amount],
          account,
        }),
      ),
    [run],
  );

  /** Withdraws an exact USDC amount. */
  const withdraw = useCallback(
    (amount: bigint) =>
      run("pending", "withdrawal", async (account) =>
        publicClient.simulateContract({
          address: MUSDC_ADDRESS,
          abi: MTOKEN_ABI,
          functionName: "redeemUnderlying",
          args: [amount],
          account,
        }),
      ),
    [run],
  );

  /**
   * Withdraws everything by redeeming the whole mToken balance. Going through
   * `redeem` rather than `redeemUnderlying` avoids leaving dust behind when the
   * exchange rate moves between quoting and mining.
   */
  const withdrawMax = useCallback(
    (mTokenBalance: bigint) =>
      run("pending", "withdrawal", async (account) =>
        publicClient.simulateContract({
          address: MUSDC_ADDRESS,
          abi: MTOKEN_ABI,
          functionName: "redeem",
          args: [mTokenBalance],
          account,
        }),
      ),
    [run],
  );

  return { tx, reset, approve, supply, withdraw, withdrawMax };
}
