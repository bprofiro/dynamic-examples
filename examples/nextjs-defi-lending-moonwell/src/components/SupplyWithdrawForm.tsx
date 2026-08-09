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

  const isBusy = tx.phase === "approving" || tx.phase === "pending";
  const canSubmit = !isBusy && amount !== null && !exceedsBalance && loggedIn;

  const setMax = () => setValue(formatUnits(maxAmount, USDC_DECIMALS));

  const handleSubmit = async () => {
    if (!amount) return;
    if (mode === "supply") {
      if (needsApproval && !(await approve(amount))) return;
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
    <div className="bg-white rounded-xl p-5 space-y-4" style={{ border: "1px solid #DADADA" }}>
      <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: "#F0F0F0" }}>
        {(["supply", "withdraw"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setMode(tab);
              setValue("");
              reset();
            }}
            className="cursor-pointer flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all capitalize"
            style={
              mode === tab
                ? {
                    background: "#fff",
                    color: "#030303",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  }
                : { color: "#606060" }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-xs font-medium" style={{ color: "#606060" }}>
            Amount (USDC)
          </label>
          <button
            type="button"
            onClick={setMax}
            disabled={isBusy}
            className="cursor-pointer text-xs hover:underline disabled:opacity-40"
            style={{ color: "#4779FF" }}
          >
            Max: {Number(formatUnits(maxAmount, USDC_DECIMALS)).toFixed(6)}
          </button>
        </div>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.000001"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0.00"
          disabled={isBusy}
          className="w-full text-sm px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-[#4779FF]/30"
          style={{
            border: `1px solid ${exceedsBalance ? "#EF4444" : "#DADADA"}`,
            background: "#fff",
            color: "#030303",
          }}
        />
        {exceedsBalance && (
          <p className="text-xs text-red-500">
            {mode === "supply"
              ? "Amount exceeds your wallet balance"
              : "Amount exceeds your supplied balance"}
          </p>
        )}
      </div>

      {!loggedIn ? (
        <p
          className="text-center text-xs py-2 rounded-lg"
          style={{ background: "#F9F9F9", border: "1px solid #DADADA", color: "#606060" }}
        >
          Sign in to {mode}
        </p>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="cursor-pointer w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: mode === "supply" ? "#4779FF" : "#606060" }}
        >
          {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
          {tx.phase === "approving"
            ? "Approving USDC…"
            : tx.phase === "pending"
              ? mode === "supply"
                ? "Supplying…"
                : "Withdrawing…"
              : needsApproval
                ? "Approve & supply"
                : mode === "supply"
                  ? "Supply"
                  : "Withdraw"}
        </button>
      )}

      {tx.phase === "error" && (
        <p className="p-2 rounded-lg text-xs bg-red-50 border border-red-200 text-red-600 break-words">
          {tx.error}
        </p>
      )}

      {tx.phase === "success" && (
        <p className="p-2 rounded-lg text-xs bg-green-50 border border-green-200 text-green-700">
          Transaction confirmed.{" "}
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
