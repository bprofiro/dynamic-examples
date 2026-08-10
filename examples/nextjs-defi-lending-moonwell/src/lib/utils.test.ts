import { describe, expect, it } from "vitest";
import { formatErrorMessage, isStaleAllowanceError } from "@/lib/utils";

describe("formatErrorMessage", () => {
  it("prefers viem's shortMessage over the full multi-line message", () => {
    expect(
      formatErrorMessage({
        shortMessage: "Insufficient funds.",
        message: "Insufficient funds.\n\nRequest Arguments:\n  from: 0x…",
      }),
    ).toBe("Insufficient funds.");
  });

  it("falls back to an Error's message", () => {
    expect(formatErrorMessage(new Error("reverted"))).toBe("reverted");
  });

  it("stringifies anything else", () => {
    expect(formatErrorMessage("plain string")).toBe("plain string");
    expect(formatErrorMessage(undefined)).toBe("undefined");
  });
});

describe("isStaleAllowanceError", () => {
  it("matches the revert a not-yet-visible approval produces", () => {
    // The exact string viem surfaces for the USDC market.
    expect(
      isStaleAllowanceError(
        new Error(
          'The contract function "mint" reverted with the following reason: ERC20: transfer amount exceeds allowance',
        ),
      ),
    ).toBe(true);
  });

  it("matches regardless of casing", () => {
    expect(isStaleAllowanceError(new Error("Insufficient Allowance"))).toBe(true);
  });

  it("does not match failures that retrying cannot fix", () => {
    // These must surface at once rather than sit behind a 20s retry loop.
    expect(
      isStaleAllowanceError(
        new Error("ERC20: transfer amount exceeds balance"),
      ),
    ).toBe(false);
    expect(isStaleAllowanceError(new Error("market is paused"))).toBe(false);
    expect(
      isStaleAllowanceError({ shortMessage: "User rejected the request." }),
    ).toBe(false);
    expect(isStaleAllowanceError(new Error("insufficient funds for gas"))).toBe(
      false,
    );
  });
});
