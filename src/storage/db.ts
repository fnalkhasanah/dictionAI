import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import { AiApiEndpoint, ApiCategory, ApiStatus, ListFilters } from "../types";

let db: DatabaseSync;

export function initDatabase(dbPath?: string): DatabaseSync {
  const resolvedPath = dbPath || path.join(__dirname, "..", "..", "data", "ai_apis.db");

  // Ensure directory exists
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new DatabaseSync(resolvedPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  createTables();
  return db;
}

function createTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS endpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      category TEXT NOT NULL DEFAULT 'other',
      provider TEXT DEFAULT '',
      requires_auth INTEGER DEFAULT 0,
      auth_note TEXT DEFAULT '',
      status TEXT DEFAULT 'unknown',
      last_checked TEXT,
      response_time_ms INTEGER,
      source TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_endpoints_category ON endpoints(category);
    CREATE INDEX IF NOT EXISTS idx_endpoints_status ON endpoints(status);
    CREATE INDEX IF NOT EXISTS idx_endpoints_provider ON endpoints(provider);
  `);
}

export function upsertEndpoint(endpoint: AiApiEndpoint): number {
  const stmt = db.prepare(`
    INSERT INTO endpoints (name, url, description, category, provider, requires_auth, auth_note, status, source, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(url) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      category = excluded.category,
      provider = excluded.provider,
      requires_auth = excluded.requires_auth,
      auth_note = excluded.auth_note,
      source = endpoints.source,
      tags = excluded.tags,
      updated_at = datetime('now')
  `);

  const result = stmt.run(
    endpoint.name,
    endpoint.url,
    endpoint.description || "",
    endpoint.category,
    endpoint.provider || "",
    endpoint.requiresAuth ? 1 : 0,
    endpoint.authNote || "",
    endpoint.status || "unknown",
    endpoint.source || "",
    JSON.stringify(endpoint.tags || [])
  );

  return Number(result.lastInsertRowid);
}

export function updateEndpointStatus(
  id: number,
  status: ApiStatus,
  responseTimeMs?: number
): void {
  const stmt = db.prepare(`
    UPDATE endpoints
    SET status = ?, response_time_ms = ?, last_checked = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(status, responseTimeMs || null, id);
}

export function getEndpoints(filters?: ListFilters): AiApiEndpoint[] {
  let query = "SELECT * FROM endpoints WHERE 1=1";
  const params: any[] = [];

  if (filters?.category) {
    query += " AND category = ?";
    params.push(filters.category);
  }
  if (filters?.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }
  if (filters?.provider) {
    query += " AND provider = ?";
    params.push(filters.provider);
  }
  if (filters?.requiresAuth !== undefined) {
    query += " AND requires_auth = ?";
    params.push(filters.requiresAuth ? 1 : 0);
  }
  if (filters?.search) {
    query += " AND (name LIKE ? OR description LIKE ? OR url LIKE ?)";
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += " ORDER BY created_at DESC";

  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(rowToEndpoint);
}

export function getEndpointById(id: number): AiApiEndpoint | undefined {
  const row = db.prepare("SELECT * FROM endpoints WHERE id = ?").get(id) as any;
  return row ? rowToEndpoint(row) : undefined;
}

export function getAllEndpoints(): AiApiEndpoint[] {
  const rows = db.prepare("SELECT * FROM endpoints ORDER BY created_at DESC").all() as any[];
  return rows.map(rowToEndpoint);
}

export function getEndpointsNeedingCheck(): AiApiEndpoint[] {
  const rows = db.prepare(`
    SELECT * FROM endpoints
    WHERE last_checked IS NULL OR last_checked < datetime('now', '-24 hours')
    ORDER BY last_checked ASC
  `).all() as any[];
  return rows.map(rowToEndpoint);
}

export function getStats(): {
  total: number;
  active: number;
  dead: number;
  unknown: number;
  byCategory: Record<string, number>;
} {
  const total = (db.prepare("SELECT COUNT(*) as count FROM endpoints").get() as any).count;
  const active = (db.prepare("SELECT COUNT(*) as count FROM endpoints WHERE status = 'active'").get() as any).count;
  const dead = (db.prepare("SELECT COUNT(*) as count FROM endpoints WHERE status = 'dead'").get() as any).count;
  const unknown = (db.prepare("SELECT COUNT(*) as count FROM endpoints WHERE status = 'unknown'").get() as any).count;

  const categoryRows = db.prepare("SELECT category, COUNT(*) as count FROM endpoints GROUP BY category").all() as any[];
  const byCategory: Record<string, number> = {};
  for (const row of categoryRows) {
    byCategory[row.category] = row.count;
  }

  return { total, active, dead, unknown, byCategory };
}

export function deleteEndpoint(id: number): boolean {
  const result = db.prepare("DELETE FROM endpoints WHERE id = ?").run(id);
  return Number(result.changes) > 0;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = undefined as any;
  }
}

function rowToEndpoint(row: any): AiApiEndpoint {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description,
    category: row.category as ApiCategory,
    provider: row.provider,
    requiresAuth: row.requires_auth === 1,
    authNote: row.auth_note || undefined,
    status: row.status as ApiStatus,
    lastChecked: row.last_checked || undefined,
    responseTimeMs: row.response_time_ms || undefined,
    source: row.source,
    tags: JSON.parse(row.tags || "[]"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}