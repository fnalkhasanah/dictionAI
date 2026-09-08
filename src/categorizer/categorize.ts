import { ApiCategory } from "../types";
import { CATEGORY_KEYWORDS } from "../config";

/**
 * Categorize an API endpoint based on its name, description, and URL.
 */
export function categorizeEndpoint(
  name: string,
  description: string,
  url: string
): ApiCategory {
  const text = `${name} ${description} ${url}`.toLowerCase();

  const scores: Record<ApiCategory, number> = {
    "text-generation": 0,
    "image-generation": 0,
    "audio-tts-stt": 0,
    embeddings: 0,
    translation: 0,
    "search-rag": 0,
    other: 0,
  };

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        scores[category as ApiCategory] += 1;
      }
    }
  }

  // Find the category with the highest score
  let maxScore = 0;
  let bestCategory: ApiCategory = "other";

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category as ApiCategory;
    }
  }

  return bestCategory;
}

/**
 * Get human-readable label for a category.
 */
export function getCategoryLabel(category: ApiCategory): string {
  const labels: Record<ApiCategory, string> = {
    "text-generation": "🤖 Text Generation",
    "image-generation": "🎨 Image Generation",
    "audio-tts-stt": "🗣️ Audio / TTS / STT",
    embeddings: "📐 Embeddings",
    translation: "🌐 Translation",
    "search-rag": "🔍 Search / RAG",
    other: "📊 Other",
  };
  return labels[category] || "Unknown";
}

/**
 * Detect if an endpoint likely requires authentication.
 */
export function detectAuthRequired(
  name: string,
  description: string,
  url: string
): { requiresAuth: boolean; note: string } {
  const text = `${name} ${description} ${url}`.toLowerCase();

  const authPatterns = [
    { pattern: /api[_\s-]?key/i, note: "Requires API key" },
    { pattern: /free[_\s-]?tier/i, note: "Free tier (may need signup)" },
    { pattern: /register/i, note: "Registration required" },
    { pattern: /signup/i, note: "Signup required" },
    { pattern: /login/i, note: "Login required" },
    { pattern: /token/i, note: "Token required" },
    { pattern: /oauth/i, note: "OAuth required" },
    { pattern: /bearer/i, note: "Bearer token required" },
    { pattern: /free[_\s-]?api[_\s-]?key/i, note: "Free API key available" },
    { pattern: /no[_\s-]?auth/i, note: "" },
    { pattern: /no[_\s-]?api[_\s-]?key/i, note: "" },
    { pattern: /no[_\s-]?signup/i, note: "" },
    { pattern: /no[_\s-]?registration/i, note: "" },
    { pattern: /no[_\s-]?key/i, note: "" },
    { pattern: /anonymous/i, note: "" },
    { pattern: /open[_\s-]?access/i, note: "" },
  ];

  // Check for "no auth" indicators first
  for (const { pattern } of authPatterns) {
    if (pattern.source.startsWith("no") || pattern.source === "anonymous" || pattern.source === "open[_\\s-]?access") {
      if (pattern.test(text)) {
        return { requiresAuth: false, note: "" };
      }
    }
  }

  // Check for auth indicators
  for (const { pattern, note } of authPatterns) {
    if (!pattern.source.startsWith("no") && pattern.source !== "anonymous" && pattern.source !== "open[_\\s-]?access") {
      if (pattern.test(text)) {
        return { requiresAuth: true, note };
      }
    }
  }

  return { requiresAuth: false, note: "" };
}
