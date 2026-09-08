import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Opens the Model Tester at /tester/ with the given endpoint URL pre-filled.
 * The tester reads model_tester_url from localStorage on load (same origin).
 */
export function openTester(url: string) {
  localStorage.setItem("model_tester_url", url);
  window.open("/tester/", "_blank");
}