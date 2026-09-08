import axios from "axios";
import { AiApiEndpoint, ScrapeResult } from "../types";
import { config } from "../config";
import { categorizeEndpoint } from "../categorizer/categorize";

/**
 * Scrape AI API endpoints from public API directories.
 * Currently uses public-apis/public-apis (Machine Learning + Text Analysis sections).
 */
export async function scrapeApiDirectories(): Promise<ScrapeResult> {
  const allEndpoints: Omit<AiApiEndpoint, "id" | "createdAt" | "updatedAt">[] = [];
  const errors: string[] = [];

  try {
    console.log("  📥 Scraping public-apis (AI/ML & Text Analysis sections)...");
    const publicApisEndpoints = await scrapePublicApis();
    allEndpoints.push(...publicApisEndpoints);
    console.log(`  ✅ Found ${publicApisEndpoints.length} AI endpoints`);
  } catch (err) {
    const errorMsg = `Failed to scrape public-apis: ${err}`;
    errors.push(errorMsg);
    console.error(`  ❌ ${errorMsg}`);
  }

  return {
    source: "api-directory",
    endpoints: allEndpoints,
    scrapedAt: new Date().toISOString(),
    errors,
  };
}

async function scrapePublicApis(): Promise<Omit<AiApiEndpoint, "id" | "createdAt" | "updatedAt">[]> {
  const rawUrl = "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md";

  const response = await axios.get(rawUrl, {
    timeout: config.scraper.requestTimeoutMs,
    headers: {
      "User-Agent": "DictionAI/1.0",
    },
  });

  const markdown = response.data;
  const endpoints: Omit<AiApiEndpoint, "id" | "createdAt" | "updatedAt">[] = [];
  const seenUrls = new Set<string>();

  // Section headers we consider AI-related (format: "### Section Name")
  const aiSectionRegex = /^###\s+(Machine Learning|Text Analysis)/i;
  let inAiSection = false;
  const lines = markdown.split("\n");

  for (const line of lines) {
    // Detect section boundaries (### headers)
    if (line.startsWith("### ")) {
      inAiSection = aiSectionRegex.test(line);
      continue;
    }

    if (!inAiSection) continue;

    // Parse table rows: | [Name](url) | Description | Auth | HTTPS | CORS |
    const tableMatch = line.match(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|/);
    if (!tableMatch) continue;

    const name = tableMatch[1].trim();
    const url = tableMatch[2].trim();
    const description = tableMatch[3].trim();
    const auth = tableMatch[4].trim().toLowerCase();

    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    const category = categorizeEndpoint(name, description, url);
    const provider = extractProviderFromUrl(url, name);
    const authInfo = parseAuthColumn(auth);

    endpoints.push({
      name,
      url,
      description: description.substring(0, 500),
      category,
      provider,
      requiresAuth: authInfo.requiresAuth,
      authNote: authInfo.note || undefined,
      status: "unknown",
      source: "public-apis",
      tags: ["public-apis"],
    });
  }

  return endpoints;
}

/**
 * Parse the Auth column of the public-apis table.
 * Values: "No", "apiKey", "OAuth", "X-Mashape-Key", "User-Agent", etc.
 */
function parseAuthColumn(auth: string): { requiresAuth: boolean; note?: string } {
  if (!auth || auth === "no" || auth === "no." || auth === "useragent" || auth === "user-agent") {
    return { requiresAuth: false };
  }
  if (auth === "apikey") {
    return { requiresAuth: true, note: "API key required" };
  }
  if (auth.includes("oauth")) {
    return { requiresAuth: true, note: "OAuth required" };
  }
  return { requiresAuth: true, note: `Auth required: ${auth}` };
}

function extractProviderFromUrl(url: string, name: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname
      .replace(/^www\./, "")
      .split(".")[0];
  } catch {
    return name.split(" ")[0] || "Unknown";
  }
}