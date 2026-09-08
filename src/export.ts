import fs from "fs";
import path from "path";
import { AiApiEndpoint, ExportOptions } from "./types";
import { getEndpoints } from "./storage/db";
import { config } from "./config";

/**
 * Export endpoints to JSON or CSV file.
 */
export async function exportData(options: ExportOptions): Promise<string> {
  const endpoints = getEndpoints({
    category: options.category,
    status: options.status,
  });

  // Ensure export directory exists
  const exportDir = options.outputPath
    ? path.dirname(options.outputPath)
    : config.export.dir;

  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
  const outputPath =
    options.outputPath ||
    path.join(exportDir, `ai-apis-${timestamp}.${options.format}`);

  if (options.format === "json") {
    exportToJson(endpoints, outputPath);
  } else if (options.format === "csv") {
    exportToCsv(endpoints, outputPath);
  }

  return outputPath;
}

function exportToJson(endpoints: AiApiEndpoint[], outputPath: string): void {
  const data = {
    exportedAt: new Date().toISOString(),
    totalEndpoints: endpoints.length,
    endpoints: endpoints.map((ep) => ({
      id: ep.id,
      name: ep.name,
      url: ep.url,
      description: ep.description,
      category: ep.category,
      provider: ep.provider,
      requiresAuth: ep.requiresAuth,
      authNote: ep.authNote,
      status: ep.status,
      lastChecked: ep.lastChecked,
      responseTimeMs: ep.responseTimeMs,
      source: ep.source,
      tags: ep.tags,
    })),
  };

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");
}

function exportToCsv(endpoints: AiApiEndpoint[], outputPath: string): void {
  const headers = [
    "ID",
    "Name",
    "URL",
    "Description",
    "Category",
    "Provider",
    "Requires Auth",
    "Auth Note",
    "Status",
    "Last Checked",
    "Response Time (ms)",
    "Source",
    "Tags",
  ];

  const rows = endpoints.map((ep) => [
    ep.id?.toString() || "",
    escapeCsv(ep.name),
    escapeCsv(ep.url),
    escapeCsv(ep.description),
    ep.category,
    escapeCsv(ep.provider),
    ep.requiresAuth ? "Yes" : "No",
    escapeCsv(ep.authNote || ""),
    ep.status,
    ep.lastChecked || "",
    ep.responseTimeMs?.toString() || "",
    ep.source,
    escapeCsv(ep.tags.join("; ")),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  fs.writeFileSync(outputPath, csv, "utf-8");
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
