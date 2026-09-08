import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Opens the Model Tester at /tester/ with the given endpoint URL pre-filled.
 * The tester reads model_tester_url from localStorage on load (same origin).
 * Falls back to same-tab navigation if the popup is blocked.
 */
export function openTester(url: string) {
  localStorage.setItem("model_tester_url", url);
  const win = window.open("/tester/", "_blank");
  if (!win) window.location.href = "/tester/";
}