// ============================================================
// Type Definitions for DictionAI
// ============================================================

export type ApiCategory =
  | "text-generation"
  | "image-generation"
  | "audio-tts-stt"
  | "embeddings"
  | "translation"
  | "search-rag"
  | "other";

export type ApiStatus = "active" | "dead" | "unknown";

export interface AiApiEndpoint {
  id?: number;
  name: string;
  url: string;
  description: string;
  category: ApiCategory;
  provider: string;
  requiresAuth: boolean;
  authNote?: string;
  status: ApiStatus;
  lastChecked?: string;
  responseTimeMs?: number;
  source: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ScrapeResult {
  source: string;
  endpoints: Omit<AiApiEndpoint, "id" | "createdAt" | "updatedAt">[];
  scrapedAt: string;
  errors: string[];
}

export interface ValidationResult {
  endpointId: number;
  url: string;
  status: ApiStatus;
  responseTimeMs: number;
  checkedAt: string;
  error?: string;
}

export interface ExportOptions {
  format: "json" | "csv";
  category?: ApiCategory;
  status?: ApiStatus;
  outputPath?: string;
}

export interface ListFilters {
  category?: ApiCategory;
  status?: ApiStatus;
  search?: string;
  provider?: string;
  requiresAuth?: boolean;
  tag?: string;
}
