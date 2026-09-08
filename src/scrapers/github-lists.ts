import axios from "axios";
import * as cheerio from "cheerio";
import { AiApiEndpoint, ScrapeResult } from "../types";
import { config } from "../config";
import { categorizeEndpoint } from "../categorizer/categorize";
import { detectAuthRequired } from "../categorizer/categorize";

interface GithubSource {
  owner: string;
  repo: string;
  path: string;
}

/**
 * Scrape AI API endpoints from GitHub awesome lists.
 */
export async function scrapeGithubLists(
  sources?: GithubSource[]
): Promise<ScrapeResult> {
  const targetSources = sources || config.sources.githubLists;
  const allEndpoints: Omit<AiApiEndpoint, "id" | "createdAt" | "updatedAt">[] = [];
  const errors: string[] = [];

  for (const source of targetSources) {
    try {
      console.log(`  📥 Scraping ${source.owner}/${source.repo}...`);
      const endpoints = await scrapeSingleRepo(source);
      allEndpoints.push(...endpoints);
      console.log(`  ✅ Found ${endpoints.length} endpoints from ${source.repo}`);
    } catch (err) {
      const errorMsg = `Failed to scrape ${source.owner}/${source.repo}: ${err}`;
      errors.push(errorMsg);
      console.error(`  ❌ ${errorMsg}`);
    }

    // Rate limit between repos
    await sleep(config.scraper.delayMs);
  }

  return {
    source: "github-lists",
    endpoints: allEndpoints,
    scrapedAt: new Date().toISOString(),
    errors,
  };
}

async function scrapeSingleRepo(
  source: GithubSource
): Promise<Omit<AiApiEndpoint, "id" | "createdAt" | "updatedAt">[]> {
  const branchesToTry = source.path ? ["main", "master"] : ["main", "master"];

  const headers: Record<string, string> = {
    "User-Agent": "DictionAI/1.0",
  };
  if (config.github.token) {
    headers["Authorization"] = `token ${config.github.token}`;
  }

  let response: { data: string } | undefined;
  let lastError: Error | undefined;

  for (const branch of branchesToTry) {
    const rawUrl = `https://raw.githubusercontent.com/${source.owner}/${source.repo}/${branch}/${source.path}`;
    try {
      response = await axios.get(rawUrl, {
        timeout: config.scraper.requestTimeoutMs,
        headers,
      });
      break;
    } catch (err) {
      lastError = err as Error;
    }
  }

  if (!response) {
    throw lastError || new Error(`Failed to fetch ${source.owner}/${source.repo}`);
  }

  const markdown = response.data;
  return parseMarkdownForApis(markdown, `${source.owner}/${source.repo}`);
}

/**
 * Parse markdown content to extract API endpoints.
 * Looks for links that point to API endpoints.
 */
function parseMarkdownForApis(
  markdown: string,
  source: string
): Omit<AiApiEndpoint, "id" | "createdAt" | "updatedAt">[] {
  const endpoints: Omit<AiApiEndpoint, "id" | "createdAt" | "updatedAt">[] = [];
  const seenUrls = new Set<string>();

  // Parse markdown links: [text](url)
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  const lines = markdown.split("\n");

  for (const line of lines) {
    // Skip headers and non-list items for cleaner extraction
    let match;
    const tempRegex = /\[([^\]]*)\]\(([^)]+)\)/g;

    while ((match = tempRegex.exec(line)) !== null) {
      const name = match[1].trim();
      const url = match[2].trim();

      // Filter: only keep URLs that look like API endpoints
      if (isValidApiUrl(url) && !seenUrls.has(url)) {
        seenUrls.add(url);

        // Extract description from surrounding text
        const description = extractDescription(line, name);

        // Categorize
        const category = categorizeEndpoint(name, description, url);

        // Detect auth
        const authInfo = detectAuthRequired(name, description, url);

        // Extract provider from URL
        const provider = extractProvider(url, name);

        // Extract tags
        const tags = extractTags(name, description, line);

        endpoints.push({
          name: cleanName(name),
          url: normalizeUrl(url),
          description,
          category,
          provider,
          requiresAuth: authInfo.requiresAuth,
          authNote: authInfo.note || undefined,
          status: "unknown",
          source,
          tags,
        });
      }
    }
  }

  return endpoints;
}

function isValidApiUrl(url: string): boolean {
  // Must be http/https
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return false;
  }

  // Skip common non-API URLs
  const skipPatterns = [
    /github\.com\/[^/]+\/[^/]+$/, // Repo homepages (no subpath)
    /github\.com\/[^/]+\/[^/]+\/(issues|pulls|wiki|actions|releases)/,
    /img\.shields\.io/, // GitHub badges
    /shields\.io/,
    /repobeats\.axiom\.co/, // Repo stats images
    /\.png$/i,
    /\.jpg$/i,
    /\.jpeg$/i,
    /\.gif$/i,
    /\.svg$/i,
    /\.webp$/i,
    /\.ico$/i,
    /twitter\.com/,
    /x\.com/,
    /linkedin\.com/,
    /facebook\.com/,
    /reddit\.com/,
    /youtube\.com/,
    /discord\.gg/,
    /t\.me/,
    /patreon\.com/,
    /buymeacoffee/,
    /opencollective/,
    /wikipedia\.org/,
    /\.md$/,
  ];

  for (const pattern of skipPatterns) {
    if (pattern.test(url)) {
      return false;
    }
  }

  // Good indicators it's an API
  const apiIndicators = [
    /api/i,
    /endpoint/i,
    /openai/i,
    /huggingface\.co/i,
    /hf\.co/i,
    /replicate\.com/i,
    /together\.ai/i,
    /anyscale/i,
    /groq/i,
    /deepinfra/i,
    /perplexity/i,
    /mistral/i,
    /cohere/i,
    /ai21/i,
    /inference/i,
    /v1\/chat/i,
    /v1\/completions/i,
    /v1\/embeddings/i,
    /generat/i,
    /predict/i,
  ];

  for (const indicator of apiIndicators) {
    if (indicator.test(url)) {
      return true;
    }
  }

  // If it's an HTTPS URL on a known cloud/API domain
  const apiDomains = [
    "api.openai.com",
    "api-inference.huggingface.co",
    "api.together.xyz",
    "api.groq.com",
    "api.deepinfra.com",
    "generativelanguage.googleapis.com",
    "api.cohere.ai",
    "api.ai21.com",
    "api.mistral.ai",
    "api.replicate.com",
  ];

  try {
    const parsedUrl = new URL(url);
    if (apiDomains.some((domain) => parsedUrl.hostname === domain)) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function extractDescription(line: string, name: string): string {
  // Remove the link syntax and clean up
  let desc = line
    .replace(/\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/^[\s\-\*\+]+/, "")
    .trim();

  // Remove the name from the beginning if duplicated
  if (desc.startsWith(name)) {
    desc = desc.substring(name.length).trim();
  }

  // Remove leading punctuation
  desc = desc.replace(/^[-:–—\s]+/, "").trim();

  return desc.substring(0, 500); // Limit length
}

function extractProvider(url: string, name: string): string {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    const providerMap: Record<string, string> = {
      "api.openai.com": "OpenAI",
      "openai.com": "OpenAI",
      "api-inference.huggingface.co": "Hugging Face",
      "huggingface.co": "Hugging Face",
      "hf.co": "Hugging Face",
      "api.together.xyz": "Together AI",
      "together.ai": "Together AI",
      "api.groq.com": "Groq",
      "groq.com": "Groq",
      "api.deepinfra.com": "DeepInfra",
      "deepinfra.com": "DeepInfra",
      "api.replicate.com": "Replicate",
      "replicate.com": "Replicate",
      "generativelanguage.googleapis.com": "Google",
      "ai.google.dev": "Google",
      "api.cohere.ai": "Cohere",
      "cohere.com": "Cohere",
      "api.ai21.com": "AI21",
      "ai21.com": "AI21",
      "api.mistral.ai": "Mistral AI",
      "mistral.ai": "Mistral AI",
      "api.perplexity.ai": "Perplexity",
      "perplexity.ai": "Perplexity",
    };

    for (const [domain, provider] of Object.entries(providerMap)) {
      if (hostname.includes(domain)) {
        return provider;
      }
    }

    // Fallback: use domain name
    return hostname.replace(/^www\./, "").split(".")[0];
  } catch {
    return name.split(" ")[0] || "Unknown";
  }
}

function normalizeUrl(url: string): string {
  // Remove trailing slashes and common trailing paths
  return url
    .replace(/\/+$/, "")
    .replace(/\/index\.html?$/i, "");
}

function cleanName(name: string): string {
  return name
    .replace(/[🔄🎯🚀⭐️💡📝🔗]/g, "")
    .trim()
    .substring(0, 200);
}

function extractTags(name: string, description: string, line: string): string[] {
  const text = `${name} ${description} ${line}`.toLowerCase();
  const tags: string[] = [];

  const tagPatterns: [RegExp, string][] = [
    [/free/i, "free"],
    [/open[- ]?source/i, "open-source"],
    [/self[- ]?hosted?/i, "self-hosted"],
    [/no[_ ]?auth/i, "no-auth"],
    [/rate[_ ]?limit/i, "rate-limited"],
    [/unlimited/i, "unlimited"],
    [/fast/i, "fast"],
    [/local/i, "local"],
    [/cloud/i, "cloud"],
    [/serverless/i, "serverless"],
    [/chat/i, "chat"],
    [/completion/i, "completion"],
    [/code/i, "code"],
    [/multimodal/i, "multimodal"],
    [/vision/i, "vision"],
  ];

  for (const [pattern, tag] of tagPatterns) {
    if (pattern.test(text) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
