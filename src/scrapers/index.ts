import { scrapeGithubLists } from "./github-lists";
import { scrapeApiDirectories } from "./api-directory";
import { scrapeNoCostAi } from "./no-cost-ai";
import { upsertEndpoint } from "../storage/db";
import { ScrapeResult } from "../types";

export interface ScrapeOptions {
  sources?: ("github-lists" | "api-directory" | "no-cost-ai")[];
}

/**
 * Run all configured scrapers and store results in database.
 */
export async function runScrapers(
  options?: ScrapeOptions
): Promise<ScrapeResult[]> {
  const sources = options?.sources || ["github-lists", "api-directory", "no-cost-ai"];
  const results: ScrapeResult[] = [];

  console.log("\n🔍 Starting scrape...\n");

  for (const source of sources) {
    console.log(`\n📂 Scraping source: ${source}`);

    let result: ScrapeResult;

    switch (source) {
      case "github-lists":
        result = await scrapeGithubLists();
        break;
      case "api-directory":
        result = await scrapeApiDirectories();
        break;
      case "no-cost-ai":
        result = await scrapeNoCostAi();
        break;
      default:
        console.log(`  ⚠️ Unknown source: ${source}, skipping.`);
        continue;
    }

    // Store results in database
    console.log(`\n  💾 Storing ${result.endpoints.length} endpoints...`);
    let storedCount = 0;
    for (const endpoint of result.endpoints) {
      try {
        upsertEndpoint(endpoint);
        storedCount++;
      } catch (err) {
        console.error(`  ❌ Failed to store ${endpoint.name}: ${err}`);
      }
    }
    console.log(`  ✅ Stored ${storedCount} endpoints`);

    results.push(result);
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Scrape Summary:");
  console.log("=".repeat(50));

  let totalEndpoints = 0;
  let totalErrors = 0;

  for (const result of results) {
    totalEndpoints += result.endpoints.length;
    totalErrors += result.errors.length;
    console.log(
      `  ${result.source}: ${result.endpoints.length} endpoints, ${result.errors.length} errors`
    );
  }

  console.log(`\n  Total: ${totalEndpoints} endpoints found, ${totalErrors} errors`);
  console.log("=".repeat(50));

  return results;
}
