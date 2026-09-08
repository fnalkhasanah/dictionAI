#!/usr/bin/env node

import { Command } from "commander";
import { initDatabase, closeDatabase, getEndpoints, getStats, getAllEndpoints, getEndpointsNeedingCheck } from "./storage/db";
import { runScrapers } from "./scrapers";
import { validateEndpoints } from "./validators/endpoint";
import { exportData } from "./export";
import { getCategoryLabel } from "./categorizer/categorize";
import { ApiCategory, ApiStatus } from "./types";

const program = new Command();

program
  .name("dictionai")
  .description("Scrape, validate, and catalog free AI API endpoints")
  .version("1.0.0");

// ==========================================
// scrape command
// ==========================================
program
  .command("scrape")
  .description("Scrape AI API endpoints from configured sources")
  .option("--source <source>", "Only scrape a specific source (github-lists, api-directory)")
  .action(async (options) => {
    initDatabase();
    try {
      const sources = options.source
        ? [options.source as "github-lists" | "api-directory" | "no-cost-ai"]
        : undefined;
      await runScrapers({ sources });
      console.log("\n✨ Scrape complete!");
    } finally {
      closeDatabase();
    }
  });

// ==========================================
// validate command
// ==========================================
program
  .command("validate")
  .description("Validate endpoint availability")
  .option("--category <category>", "Only validate endpoints in a category")
  .option("--status <status>", "Only validate endpoints with a status (active, dead, unknown)")
  .option("--all", "Validate ALL endpoints (including recently checked)")
  .action(async (options) => {
    initDatabase();
    try {
      let endpoints;
      if (options.category || options.status) {
        endpoints = getEndpoints({
          category: options.category as ApiCategory,
          status: options.status as ApiStatus,
        });
      } else if (options.all) {
        endpoints = getAllEndpoints();
      } else {
        endpoints = getEndpointsNeedingCheck();
      }

      console.log(`\n✅ Validating ${endpoints.length} endpoints...\n`);

      const results = await validateEndpoints(endpoints, (current, total, result) => {
        const symbol = result.status === "active" ? "✅" : result.status === "dead" ? "❌" : "❓";
        const detail = result.error ? ` - ${result.error}` : "";
        console.log(`  [${current}/${total}] ${symbol} ${result.url} (${result.responseTimeMs}ms)${detail}`);
      });

      const active = results.filter((r) => r.status === "active").length;
      const dead = results.filter((r) => r.status === "dead").length;

      console.log("\n" + "=".repeat(50));
      console.log("📊 Validation Summary:");
      console.log("=".repeat(50));
      console.log(`  Total: ${results.length}`);
      console.log(`  ✅ Active: ${active}`);
      console.log(`  ❌ Dead: ${dead}`);
      console.log("=".repeat(50));
    } finally {
      closeDatabase();
    }
  });

// ==========================================
// export command
// ==========================================
program
  .command("export")
  .description("Export endpoints to JSON or CSV")
  .option("-f, --format <format>", "Export format (json or csv)", "json")
  .option("--category <category>", "Only export endpoints in a category")
  .option("--status <status>", "Only export endpoints with a status")
  .option("-o, --output <path>", "Output file path")
  .action(async (options) => {
    initDatabase();
    try {
      if (!["json", "csv"].includes(options.format)) {
        console.error(`❌ Invalid format: ${options.format}. Use "json" or "csv".`);
        process.exit(1);
      }

      const outputPath = await exportData({
        format: options.format,
        category: options.category as ApiCategory,
        status: options.status as ApiStatus,
        outputPath: options.output,
      });

      console.log(`✅ Exported to: ${outputPath}`);
    } finally {
      closeDatabase();
    }
  });

// ==========================================
// list command
// ==========================================
program
  .command("list")
  .description("List endpoints in the database")
  .option("--category <category>", "Filter by category")
  .option("--status <status>", "Filter by status (active, dead, unknown)")
  .option("--search <query>", "Search by name, description, or URL")
  .option("--provider <provider>", "Filter by provider")
  .option("--auth", "Only show endpoints requiring auth")
  .option("--no-auth", "Only show endpoints NOT requiring auth")
  .option("--json", "Output as JSON")
  .action((options) => {
    initDatabase();
    try {
      const requiresAuth = options.auth ? true : options.noAuth ? false : undefined;

      const endpoints = getEndpoints({
        category: options.category as ApiCategory,
        status: options.status as ApiStatus,
        search: options.search as string,
        provider: options.provider as string,
        requiresAuth,
      });

      if (options.json) {
        console.log(JSON.stringify(endpoints, null, 2));
        return;
      }

      const stats = getStats();
      console.log("\n" + "=".repeat(90));
      console.log(`📋 Endpoints: ${endpoints.length} (total in DB: ${stats.total})`);
      console.log("=".repeat(90));

      if (endpoints.length === 0) {
        console.log("  No endpoints found. Run `npm run scrape` first.");
        return;
      }

      endpoints.forEach((ep) => {
        const symbol =
          ep.status === "active" ? "✅" : ep.status === "dead" ? "❌" : "❓";
        const auth = ep.requiresAuth ? "🔐" : "🔓";
        const prefix = ep.id?.toString().padStart(5, " ") || "     ";

        console.log(`${prefix} ${symbol} ${auth} [${ep.category.padEnd(16)}] ${ep.name}`);
        console.log(`         ${ep.url}`);
        if (ep.authNote) {
          console.log(`         ⚠️  ${ep.authNote}`);
        }
        if (ep.responseTimeMs) {
          console.log(`         ⚡ ${ep.responseTimeMs}ms — last checked: ${ep.lastChecked}`);
        }
        console.log("");
      });
    } finally {
      closeDatabase();
    }
  });

// ==========================================
// stats command
// ==========================================
program
  .command("stats")
  .description("Show database statistics")
  .action(() => {
    initDatabase();
    try {
      const stats = getStats();
      console.log("\n📊 Database Statistics:");
      console.log("=".repeat(40));
      console.log(`  Total endpoints: ${stats.total}`);
      console.log(`  ✅ Active: ${stats.active}`);
      console.log(`  ❌ Dead: ${stats.dead}`);
      console.log(`  ❓ Unknown: ${stats.unknown}`);
      console.log("");
      console.log("  By Category:");
      for (const [cat, count] of Object.entries(stats.byCategory)) {
        console.log(`    ${getCategoryLabel(cat as ApiCategory)}: ${count}`);
      }
      console.log("=".repeat(40) + "\n");
    } finally {
      closeDatabase();
    }
  });

// ==========================================
// seed command
// ==========================================
program
  .command("seed")
  .description("Seed the database with known popular free AI API endpoints")
  .action(async () => {
    initDatabase();
    try {
      const { seedKnownApis } = await import("./seed");
      const count = seedKnownApis();
      console.log(`\n🌱 Seeded ${count} known AI API endpoints.`);
    } finally {
      closeDatabase();
    }
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.help();
}