"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createWalletClientForWalletAccount } from "@dynamic-labs-sdk/evm/viem";
import type { EvmWalletAccount } from "@dynamic-labs-sdk/evm";
import { ERC20_ABI, MTOKEN_ABI } from "@/lib/ABIs";
import { CHAIN_ID, MUSDC_ADDRESS, USDC_ADDRESS } from "@/lib/constants";
import { balancesQueryKey } from "@/lib/hooks/useBalances";
import { publicClient } from "@/lib/viem";
import { formatErrorMessage } from "@/lib/utils";

export type TxPhase = "idle" | "approving" | "pending" | "success" | "error";

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

export function useLendingOperations(evmAccount: EvmWalletAccount | null) {
  const queryClient = useQueryClient();
  const [tx, setTx] = useState<TxState>(IDLE);

  const address = evmAccount?.address as `0x${string}` | undefined;

  const getWalletClient = useCallback(async () => {
    if (!evmAccount) throw new Error("Connect a wallet first");
    const walletClient = await createWalletClientForWalletAccount({
      walletAccount: evmAccount,
    });
    if (walletClient.chain?.id !== CHAIN_ID) {
      throw new Error(
        `Wallet is on chain ${walletClient.chain?.id ?? "unknown"}; switch to Base (${CHAIN_ID}).`,
      );
    }
    return walletClient;
  }, [evmAccount]);

  const reset = useCallback(() => setTx(IDLE), []);

  /**
   * Runs one simulate → write → wait cycle and keeps `tx` in step with it.
   * `phase` is the caller's label for the in-flight state so the UI can tell
   * an approval apart from the supply that follows it.
   */
  const run = useCallback(
    async (
      phase: Exclude<TxPhase, "idle" | "success" | "error">,
      action: string,
      simulate: (owner: `0x${string}`) => Promise<{
        request: Parameters<
          Awaited<ReturnType<typeof getWalletClient>>["writeContract"]
        >[0];
        result: unknown;
      }>,
    ) => {
      if (!address) {
        setTx({ phase: "error", error: "Connect a wallet first" });
        return false;
      }
      setTx({ phase });
      try {
        const walletClient = await getWalletClient();
        const { request, result } = await simulate(address);
        assertNoErrorCode(result, action);

        const hash = await walletClient.writeContract(request);
        setTx({ phase, hash });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          throw new Error(`${action} transaction reverted`);
        }

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

  /** Approves the mToken to spend `amount` USDC. No-op if already allowed. */
  const approve = useCallback(
    (amount: bigint) =>
      run("approving", "approval", async (owner) =>
        publicClient.simulateContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [MUSDC_ADDRESS, amount],
          account: owner,
        }),
      ),
    [run],
  );

  /** Supplies USDC and receives mUSDC. */
  const supply = useCallback(
    (amount: bigint) =>
      run("pending", "supply", async (owner) =>
        publicClient.simulateContract({
          address: MUSDC_ADDRESS,
          abi: MTOKEN_ABI,
          functionName: "mint",
          args: [amount],
          account: owner,
        }),
      ),
    [run],
  );

  /** Withdraws an exact USDC amount. */
  const withdraw = useCallback(
    (amount: bigint) =>
      run("pending", "withdrawal", async (owner) =>
        publicClient.simulateContract({
          address: MUSDC_ADDRESS,
          abi: MTOKEN_ABI,
          functionName: "redeemUnderlying",
          args: [amount],
          account: owner,
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
      run("pending", "withdrawal", async (owner) =>
        publicClient.simulateContract({
          address: MUSDC_ADDRESS,
          abi: MTOKEN_ABI,
          functionName: "redeem",
          args: [mTokenBalance],
          account: owner,
        }),
      ),
    [run],
  );

  return { tx, reset, approve, supply, withdraw, withdrawMax };
}
