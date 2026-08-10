"use client";

import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { Loader2 } from "lucide-react";
import { BASESCAN_URL, USDC_DECIMALS } from "@/lib/constants";
import {
  useLendingOperations,
  type Balances,
} from "@/lib/hooks";
import { useWallet } from "@/lib/providers";

type Mode = "supply" | "withdraw";

/** Parses user input, returning null when it is not a usable amount. */
function parseAmount(value: string): bigint | null {
  if (!value.trim()) return null;
  try {
    const parsed = parseUnits(value, USDC_DECIMALS);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

export function SupplyWithdrawForm({ balances }: { balances?: Balances }) {
  const { evmAccount, loggedIn } = useWallet();
  const { tx, reset, approve, supply, withdraw, withdrawMax } =
    useLendingOperations(evmAccount);

  const [mode, setMode] = useState<Mode>("supply");
  const [value, setValue] = useState("");

  const amount = parseAmount(value);
  const maxAmount =
    mode === "supply" ? (balances?.walletUsdc ?? 0n) : (balances?.suppliedUsdc ?? 0n);
  const exceedsBalance = amount !== null && amount > maxAmount;
  const needsApproval =
    mode === "supply" && amount !== null && (balances?.allowance ?? 0n) < amount;

  const isBusy =
    tx.phase === "switching" ||
    tx.phase === "approving" ||
    tx.phase === "pending";
  const canSubmit = !isBusy && amount !== null && !exceedsBalance && loggedIn;

  const setMax = () => setValue(formatUnits(maxAmount, USDC_DECIMALS));

  const handleSubmit = async () => {
    if (!amount) return;
    if (mode === "supply") {
      // Approve and supply are deliberately separate clicks, matching the
      // Moonwell app. Chaining them races the RPC: the mint would simulate
      // against an allowance the node serving it has not caught up to, and
      // revert with "transfer amount exceeds allowance" despite a successful
      // approval. The second click is the wait.
      if (needsApproval) {
        await approve(amount);
        return;
      }
      await supply(amount);
      setValue("");
      return;
    }
    // A "withdraw everything" request redeems the mToken balance outright so no
    // dust is left behind by an exchange-rate tick between quote and mining.
    const isFullWithdrawal = amount === maxAmount && maxAmount > 0n;
    if (isFullWithdrawal && balances) {
      await withdrawMax(balances.mTokenBalance);
    } else {
      await withdraw(amount);
    }
    setValue("");
  };

  return (
    <div className="rounded-2xl border border-mw-grey-100 p-4 space-y-4">
      <div className="flex gap-6 border-b border-mw-grey-100">
        {(["supply", "withdraw"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setMode(tab);
              setValue("");
              reset();
            }}
            className={`cursor-pointer pb-3 -mb-px text-sm capitalize border-b-2 transition-colors ${
              mode === tab
                ? "border-mw-blue text-mw-blue font-bold"
                : "border-transparent text-mw-grey-400 hover:text-mw-black"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-sm text-mw-grey-400">Amount</label>
          <button
            type="button"
            onClick={setMax}
            disabled={isBusy}
            className="cursor-pointer font-mono text-xs text-mw-blue hover:underline disabled:opacity-40"
          >
            Max {Number(formatUnits(maxAmount, USDC_DECIMALS)).toFixed(6)}
          </button>
        </div>
        <div
          className={`flex items-center rounded-lg border px-3 ${
            exceedsBalance ? "border-mw-red-600" : "border-mw-grey-200"
          }`}
        >
          {/*
            A text input, not `type="number"`. A number input renders its value
            through the browser locale, so "4.000045" displays as "4,000045" for
            a comma-decimal user — indistinguishable from four million in an
            amount field. It also mutates the value on scroll. The pattern below
            accepts digits and a single dot, which is what `parseUnits` wants.
          */}
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            onChange={(e) => {
              const next = e.target.value.replace(",", ".");
              if (next === "" || /^\d*\.?\d*$/.test(next)) setValue(next);
            }}
            placeholder="0.00"
            disabled={isBusy}
            className="tabular flex-1 py-2.5 text-sm bg-transparent outline-none"
          />
          <span className="font-mono text-sm text-mw-grey-400">USDC</span>
        </div>
        {exceedsBalance && (
          <p className="text-xs text-mw-red-600">
            {mode === "supply"
              ? "Amount exceeds your wallet balance"
              : "Amount exceeds your supplied balance"}
          </p>
        )}
      </div>

      {!loggedIn ? (
        <p className="text-center font-mono text-sm py-2.5 rounded-lg border border-mw-grey-200 text-mw-grey-400">
          Sign in to {mode}
        </p>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="cursor-pointer w-full flex items-center justify-center gap-2 font-mono text-sm py-2.5 rounded-lg bg-mw-blue-700 hover:bg-mw-blue text-white transition-colors disabled:bg-mw-grey-100 disabled:text-mw-grey-300 disabled:cursor-not-allowed"
        >
          {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
          {tx.phase === "switching"
            ? "Switching to Base…"
            : tx.phase === "approving"
              ? "Approving USDC…"
              : tx.phase === "pending"
                ? mode === "supply"
                  ? "Supplying…"
                  : "Withdrawing…"
                : needsApproval
                  ? "Approve USDC"
                  : mode === "supply"
                    ? "Supply"
                    : "Withdraw"}
        </button>
      )}

      {tx.phase === "error" && (
        <p className="p-2.5 rounded-lg text-xs bg-mw-red-100 text-mw-red-600 break-words">
          {tx.error}
        </p>
      )}

      {tx.phase === "success" && (
        <p className="p-2.5 rounded-lg text-xs bg-mw-green-100 text-mw-green-800">
          {tx.action === "approval"
            ? "Approval confirmed — you can supply now."
            : "Transaction confirmed."}{" "}
          {tx.hash && (
            <a
              href={`${BASESCAN_URL}/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View on Basescan
            </a>
          )}
        </p>
      )}
    </div>
  );
}
