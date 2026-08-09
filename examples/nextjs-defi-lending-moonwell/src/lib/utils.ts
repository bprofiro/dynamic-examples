import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "shortMessage" in error) {
    const short = (error as { shortMessage?: string }).shortMessage;
    if (short) return short;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
