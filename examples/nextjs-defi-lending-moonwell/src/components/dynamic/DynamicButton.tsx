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
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium opacity-70"
        style={{ borderColor: "#DADADA", color: "#606060", background: "#fff" }}
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
          className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors"
          style={{
            borderColor: "#DADADA",
            color: "#030303",
            background: "#fff",
          }}
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "#4779FF" }}
          >
            {(user.email ?? "0x").slice(0, 2).toUpperCase()}
          </span>
          {evmAccount ? truncate(evmAccount.address) : "Setting up…"}
        </button>

        {open && (
          <div
            className="absolute right-0 mt-1 min-w-[16rem] rounded-xl shadow-lg border z-50 overflow-hidden"
            style={{ borderColor: "#DADADA", background: "#fff" }}
          >
            <div className="px-3 py-2.5 border-b" style={{ borderColor: "#DADADA" }}>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "#606060" }}>
                Signed in as
              </p>
              <p className="text-sm font-medium truncate" style={{ color: "#030303" }}>
                {user.email ?? "—"}
              </p>
            </div>

            <div className="p-2">
              {evmAccount ? (
                <div className="flex items-center justify-between rounded-md px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: "#606060" }}>
                      Base wallet
                    </p>
                    <p className="font-mono text-xs" style={{ color: "#030303" }}>
                      {truncate(evmAccount.address)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(evmAccount.address);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="cursor-pointer p-1 rounded"
                    style={{ color: "#606060" }}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2 py-2 text-xs" style={{ color: "#606060" }}>
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
              className="cursor-pointer w-full text-left px-4 py-3 text-sm border-t transition-colors hover:bg-[#F9F9F9]"
              style={{ borderColor: "#DADADA", color: "#606060" }}
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
      <button
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
        style={{ background: "#4779FF" }}
      >
        Sign in
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-72 rounded-xl shadow-lg border z-50 p-4"
          style={{ borderColor: "#DADADA", background: "#fff" }}
        >
          <Login onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
