"use client";

import { useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useSendEmailOTP, useVerifyOTP } from "@dynamic-labs-sdk/react-hooks";

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
        <p className="text-xs font-medium" style={{ color: "#030303" }}>
          Enter your email
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-[#4779FF]/30"
          style={{ borderColor: "#DADADA", color: "#030303" }}
          onKeyDown={(e) => e.key === "Enter" && email && sendEmailOTP({ email })}
        />
        <button
          onClick={() => sendEmailOTP({ email })}
          disabled={isSending || !email}
          className="cursor-pointer w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ background: "#4779FF" }}
        >
          {isSending && <Loader2 className="h-4 w-4 animate-spin" />}
          Send code
        </button>
        {error && (
          <p className="text-xs text-red-500 text-center">{error.message}</p>
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
        className="cursor-pointer text-xs flex items-center gap-1"
        style={{ color: "#606060" }}
      >
        <ChevronLeft className="h-3 w-3" />
        Back
      </button>
      <p className="text-xs" style={{ color: "#606060" }}>
        Code sent to{" "}
        <span className="font-medium" style={{ color: "#030303" }}>
          {email}
        </span>
      </p>
      <input
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="Enter 6-digit code"
        className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-[#4779FF]/30 tracking-widest text-center"
        style={{ borderColor: "#DADADA", color: "#030303" }}
      />
      <button
        onClick={() =>
          verifyOTP(
            { otpVerification, verificationToken: code },
            { onSuccess: () => onDone?.() },
          )
        }
        disabled={isVerifying || code.length < 6}
        className="cursor-pointer w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
        style={{ background: "#4779FF" }}
      >
        {isVerifying && <Loader2 className="h-4 w-4 animate-spin" />}
        Verify
      </button>
      {error && (
        <p className="text-xs text-red-500 text-center">{error.message}</p>
      )}
    </div>
  );
}
