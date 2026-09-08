export interface Endpoint {
  id: number;
  name: string;
  url: string;
  description: string;
  category: string;
  provider: string;
  requiresAuth: boolean;
  authNote?: string;
  status: "active" | "dead" | "unknown";
  lastChecked?: string;
  responseTimeMs?: number;
  source: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Stats {
  total: number;
  active: number;
  dead: number;
  unknown: number;
  byCategory: Record<string, number>;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface Filters {
  category?: string;
  status?: string;
  search?: string;
  tag?: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function getStats() {
  return request<Stats>("/api/stats");
}

export function getTags() {
  return request<TagCount[]>("/api/tags");
}

export function getEndpoints(filters: Filters) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return request<{ total: number; endpoints: Endpoint[] }>(
    `/api/endpoints${qs ? `?${qs}` : ""}`
  );
}

export function getEndpoint(id: number) {
  return request<Endpoint>(`/api/endpoints/${id}`);
}

export async function scrape() {
  const res = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Scrape failed");
  return data as { totalEndpoints: number; totalErrors: number };
}

export async function validateEndpoint(id: number) {
  const data = await request<{ status: string; responseTimeMs?: number }>(
    `/api/validate/${id}`,
    { method: "POST" }
  );
  return data;
}

export async function validateAll() {
  const data = await request<{ total: number; active: number; dead: number }>(
    "/api/validate-all",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
  );
  return data;
}

export async function exportData(format: "json" | "csv") {
  const data = await request<{ success: boolean; path?: string }>("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format }),
  });
  return data;
}

export async function deleteEndpoint(id: number) {
  await request<{ success: boolean }>(`/api/endpoints/${id}`, { method: "DELETE" });
}