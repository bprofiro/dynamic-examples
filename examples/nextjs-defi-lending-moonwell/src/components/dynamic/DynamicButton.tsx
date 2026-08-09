"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import {
  useInitStatus,
  useLogout,
  useUser,
} from "@dynamic-labs-sdk/react-hooks";
import { Login } from "@/components/Login";
import { useWallet } from "@/lib/providers";

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Outlined blue action, matching the Connect Wallet button on moonwell.fi. */
const OUTLINED =
  "cursor-pointer font-mono text-sm py-1.5 px-4 rounded-lg border border-mw-blue text-mw-blue hover:bg-mw-blue-100 transition-colors";

export default function DynamicButton() {
  const { data: initStatus, error: initError } = useInitStatus();
  const { data: user } = useUser();
  const { evmAccount } = useWallet();
  const { mutate: logout } = useLogout();

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Every hook returns null or an empty list until init finishes, so gate the
  // whole control on it rather than rendering a misleading signed-out state.
  if (initStatus !== "finished") {
    return (
      <button
        disabled
        className="font-mono text-sm py-1.5 px-4 rounded-lg border border-mw-grey-200 text-mw-grey-400 flex items-center gap-2"
      >
        {initStatus === "failed" ? (
          (initError?.message ?? "Dynamic failed to load")
        ) : (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </>
        )}
      </button>
    );
  }

  if (user) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="cursor-pointer flex items-center gap-2 font-mono text-sm py-1.5 px-3 rounded-lg border border-mw-grey-200 hover:border-mw-blue transition-colors"
        >
          <span className="w-6 h-6 rounded-full bg-mw-blue-200 text-mw-blue-900 flex items-center justify-center text-[10px] font-medium uppercase">
            {(user.email ?? "0x").slice(0, 2)}
          </span>
          {evmAccount ? truncate(evmAccount.address) : "Setting up…"}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 min-w-[16rem] rounded-2xl border border-mw-grey-100 bg-white shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-mw-grey-100">
              <p className="text-xs text-mw-grey-400">Signed in as</p>
              <p className="text-sm truncate">{user.email ?? "—"}</p>
            </div>

            <div className="p-2">
              {evmAccount ? (
                <div className="flex items-center justify-between px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="text-xs text-mw-grey-400">Base wallet</p>
                    <p className="font-mono text-xs">
                      {truncate(evmAccount.address)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(evmAccount.address);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="cursor-pointer p-1 rounded text-mw-grey-400 hover:text-mw-black"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-mw-green-800" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2 py-2 text-xs text-mw-grey-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating your embedded wallet…
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="cursor-pointer w-full text-left px-4 py-3 text-sm border-t border-mw-grey-100 text-mw-grey-400 hover:bg-mw-grey-50 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className={OUTLINED}>
        Connect Wallet
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-mw-grey-100 bg-white shadow-lg z-50 p-4">
          <Login onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
