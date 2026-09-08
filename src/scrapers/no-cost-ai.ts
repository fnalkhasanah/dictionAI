import axios from "axios";
import { AiApiEndpoint, ScrapeResult } from "../types";
import { config } from "../config";
import { categorizeEndpoint, detectAuthRequired } from "../categorizer/categorize";

/**
 * Scraper khusus untuk github.com/BedMan95/no-cost-ai
 *
 * Repo ini menyajikan data dalam tabel markdown dengan format:
 *   | Link | Free Models | Limits |
 * Section yang relevan untuk kamus API (DictionAI):
 *   - "### Developer APIs & Platforms" (No Signup Required)
 *   - "### Developer APIs & Platforms" (Signup Required)
 *
 * Section lain (Chat Interfaces / Media / Voice / Leaderboards) adalah
 * web UI dan leaderboard, bukan API endpoint — tidak di-scrape.
 */
export async function scrapeNoCostAi(): Promise<ScrapeResult> {
  const rawUrl =
    "https://raw.githubusercontent.com/BedMan95/no-cost-ai/main/README.md";
  const endpoints: Omit<AiApiEndpoint, "id" | "createdAt" | "updatedAt">[] = [];
  const errors: string[] = [];

  try {
    console.log("  📥 Scraping BedMan95/no-cost-ai (Developer APIs sections)...");

    const response = await axios.get(rawUrl, {
      timeout: config.scraper.requestTimeoutMs,
      headers: {
        "User-Agent": "DictionAI/1.0",
      },
    });

    const markdown = response.data;
    const seenUrls = new Set<string>();

    // Track state: which section are we in?
    let inDeveloperApis = false;
    let requiresAuth = false; // section 1 = no signup, section 2 = signup required
    const lines = markdown.split("\n");

    for (const line of lines) {
      // Detect section boundaries
      if (line.startsWith("### ")) {
        const isDevApis = line.includes("Developer APIs & Platforms");
        // "## Signup Required" heading appears before section 2; when we hit a new
        // "Developer APIs" under the Signup Required part, flip the auth flag.
        inDeveloperApis = isDevApis;
        continue;
      }
      if (line.startsWith("## ")) {
        inDeveloperApis = false;
        const heading = line.toLowerCase();
        if (heading.includes("no sign")) {
          requiresAuth = false;
        } else if (heading.includes("signup required")) {
          requiresAuth = true;
        }
        continue;
      }

      if (!inDeveloperApis) continue;

      // Parse table row: | [Name](url) | Free Models | Limits |
      const match = line.match(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|$/);
      if (!match) {
        // Fallback for rows truncated in the source README, or rows with
        // nested links between the URL and the first pipe:
        // capture name + URL + whatever follows (no closing pipe required).
        const loose = line.match(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*(.*)$/);
        if (!loose) continue;
        const looseRow = {
          name: loose[1].trim(),
          url: loose[2].trim(),
          freeModels: cleanCell(loose[3]),
          limits: "",
          truncated: true,
        };
        const endpoint = buildEndpoint(looseRow, requiresAuth, seenUrls);
        if (endpoint) endpoints.push(endpoint);
        continue;
      }

      const row = {
        name: match[1].trim(),
        url: match[2].trim(),
        freeModels: cleanCell(match[3]),
        limits: cleanCell(match[4]),
        truncated: false,
      };
      const endpoint = buildEndpoint(row, requiresAuth, seenUrls);
      if (endpoint) endpoints.push(endpoint);
    }

    console.log(`  ✅ Found ${endpoints.length} API entries from no-cost-ai`);
  } catch (err) {
    const errorMsg = `Failed to scrape no-cost-ai: ${err}`;
    errors.push(errorMsg);
    console.error(`  ❌ ${errorMsg}`);
  }

  return {
    source: "no-cost-ai",
    endpoints,
    scrapedAt: new Date().toISOString(),
    errors,
  };
}

function cleanCell(cell: string): string {
  return cell
    .replace(/<[^>]+>/g, "") // strip HTML like <kbd>, <br>
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // collapse nested markdown links
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface ParsedRow {
  name: string;
  url: string;
  freeModels: string;
  limits: string;
  truncated: boolean;
}

function buildEndpoint(
  row: ParsedRow,
  requiresAuth: boolean,
  seenUrls: Set<string>
): Omit<AiApiEndpoint, "id" | "createdAt" | "updatedAt"> | undefined {
  let url = row.url;

  if (!url.startsWith("http")) return undefined;
  if (seenUrls.has(url)) return undefined;
  seenUrls.add(url);

  // Normalize URL: strip trailing slash, drop fragment-only junk
  url = url.replace(/\/+$/, "");

  const description = buildDescription(row.freeModels, row.limits);
  const category = categorizeEndpoint(row.name, description, url);
  const authDetected = detectAuthRequired(row.name, description, url);

  return {
    name: row.name,
    url,
    description,
    category,
    provider: extractProvider(url, row.name),
    requiresAuth: requiresAuth || authDetected.requiresAuth,
    authNote: requiresAuth
      ? "Signup required" + (authDetected.note ? ` — ${authDetected.note}` : "")
      : authDetected.note || undefined,
    status: "unknown",
    source: "no-cost-ai",
    tags: buildTags(requiresAuth, row.freeModels, row.limits, row.truncated),
  };
}

function buildDescription(freeModels: string, limits: string): string {
  const parts: string[] = [];
  if (freeModels) parts.push(`Free models: ${freeModels}`);
  if (limits) parts.push(`Limits: ${limits}`);
  return parts.join(" | ").substring(0, 500);
}

function buildTags(
  requiresAuth: boolean,
  freeModels: string,
  limits: string,
  truncated = false
): string[] {
  const tags = ["no-cost-ai"];
  tags.push(requiresAuth ? "signup-required" : "no-signup");
  if (truncated) tags.push("entry-truncated");

  const text = `${freeModels} ${limits}`.toLowerCase();
  if (text.includes("unlimited")) tags.push("unlimited");
  if (text.includes("limit")) tags.push("rate-limited");
  if (text.includes("openai-compatible")) tags.push("openai-compatible");
  if (text.includes("self-host")) tags.push("self-hosted");
  if (text.includes("tts") || text.includes("speech")) tags.push("tts");
  if (text.includes("image")) tags.push("image");
  if (text.includes("video")) tags.push("video");

  return tags;
}

function extractProvider(url: string, name: string): string {
  // Known provider hostnames
  const providerMap: Record<string, string> = {
    "uncloseai.com": "Unclose AI",
    "ollama.com": "Ollama",
    "ollama": "Ollama",
    "g4f.dev": "g4f.dev",
    "groq.com": "Groq",
    "ai.google.dev": "Google",
    "deepseek.com": "DeepSeek",
    "together.ai": "Together AI",
    "replicate.com": "Replicate",
    "anthropic.com": "Anthropic",
    "openai.com": "OpenAI",
    "openrouter.ai": "OpenRouter",
    "cloudflare.com": "Cloudflare",
    "fireworks.ai": "Fireworks AI",
    "ibm.com": "IBM",
    "huggingface.co": "Hugging Face",
    "pollinations.ai": "Pollinations",
    "llm7.io": "llm7",
    "anyapi.ai": "AnyAPI",
    "puter.com": "Puter",
  };

  for (const [domain, provider] of Object.entries(providerMap)) {
    if (url.includes(domain)) return provider;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.replace(/^www\./, "").split(".")[0];
  } catch {
    return name.split(" ")[0] || "Unknown";
  }
}