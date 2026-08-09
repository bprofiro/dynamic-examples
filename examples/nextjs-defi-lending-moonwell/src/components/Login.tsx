"use client";

import { useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useSendEmailOTP, useVerifyOTP } from "@dynamic-labs-sdk/react-hooks";

const INPUT =
  "w-full px-3 py-2.5 text-sm rounded-lg border border-mw-grey-200 outline-none focus:border-mw-blue transition-colors";

const SUBMIT =
  "cursor-pointer w-full flex items-center justify-center gap-2 font-mono text-sm py-2.5 rounded-lg bg-mw-blue-700 hover:bg-mw-blue text-white transition-colors disabled:bg-mw-grey-100 disabled:text-mw-grey-300 disabled:cursor-not-allowed";

/**
 * Headless email-OTP sign-in. The JavaScript SDK ships no modal, so the whole
 * flow is two mutations: `useSendEmailOTP` returns the `OTPVerification` handle
 * that `useVerifyOTP` needs, and the code goes in as `verificationToken`.
 */
export function Login({ onDone }: { onDone?: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const {
    mutate: sendEmailOTP,
    data: otpVerification,
    isPending: isSending,
    error: sendError,
    reset: resetSend,
  } = useSendEmailOTP();

  const {
    mutate: verifyOTP,
    isPending: isVerifying,
    error: verifyError,
  } = useVerifyOTP();

  const error = sendError ?? verifyError;

  if (!otpVerification) {
    return (
      <div className="space-y-3">
        <p className="text-sm">Enter your email</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={INPUT}
          onKeyDown={(e) => e.key === "Enter" && email && sendEmailOTP({ email })}
        />
        <button
          onClick={() => sendEmailOTP({ email })}
          disabled={isSending || !email}
          className={SUBMIT}
        >
          {isSending && <Loader2 className="h-4 w-4 animate-spin" />}
          Send Code
        </button>
        {error && (
          <p className="text-xs text-mw-red-600 text-center">{error.message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => {
          resetSend();
          setCode("");
        }}
        className="cursor-pointer text-xs flex items-center gap-1 text-mw-grey-400 hover:text-mw-black transition-colors"
      >
        <ChevronLeft className="h-3 w-3" />
        Back
      </button>
      <p className="text-xs text-mw-grey-400">
        Code sent to <span className="text-mw-black">{email}</span>
      </p>
      <input
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="Enter 6-digit code"
        className={`${INPUT} font-mono tracking-[0.4em] text-center`}
      />
      <button
        onClick={() =>
          verifyOTP(
            { otpVerification, verificationToken: code },
            { onSuccess: () => onDone?.() },
          )
        }
        disabled={isVerifying || code.length < 6}
        className={SUBMIT}
      >
        {isVerifying && <Loader2 className="h-4 w-4 animate-spin" />}
        Verify
      </button>
      {error && (
        <p className="text-xs text-mw-red-600 text-center">{error.message}</p>
      )}
    </div>
  );
}
