import axios, { AxiosError } from "axios";
import { AiApiEndpoint, ApiStatus, ValidationResult } from "../types";
import { updateEndpointStatus } from "../storage/db";
import { config } from "../config";

/**
 * Validate a single endpoint by making an HTTP request.
 * Returns the validation result.
 */
export async function validateEndpoint(
  endpoint: AiApiEndpoint
): Promise<ValidationResult> {
  const startTime = Date.now();
  let status: ApiStatus = "dead";
  let error: string | undefined;

  try {
    const response = await axios.head(endpoint.url, {
      timeout: config.scraper.requestTimeoutMs,
      validateStatus: (statusCode) => {
        // Consider 2xx, 3xx, and 4xx as "alive" (server is responding)
        // Only 5xx or connection errors mean "dead"
        return statusCode < 500;
      },
      headers: {
        "User-Agent": "DictionAI/1.0",
      },
      maxRedirects: 5,
    });

    const responseTimeMs = Date.now() - startTime;

    if (response.status >= 200 && response.status < 400) {
      status = "active";
    } else if (response.status >= 400 && response.status < 500) {
      // 4xx means server is alive but might need auth
      status = "active";
    }

    // Update in database
    if (endpoint.id) {
      updateEndpointStatus(endpoint.id, status, responseTimeMs);
    }

    return {
      endpointId: endpoint.id || 0,
      url: endpoint.url,
      status,
      responseTimeMs,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    const responseTimeMs = Date.now() - startTime;
    const axiosError = err as AxiosError;

    if (axiosError.code === "ECONNABORTED" || axiosError.code === "ETIMEDOUT") {
      error = "Request timed out";
    } else if (axiosError.code === "ENOTFOUND") {
      error = "Host not found";
    } else if (axiosError.code === "ECONNREFUSED") {
      error = "Connection refused";
    } else if (axiosError.response) {
      error = `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`;
      // If we got a response, the server is alive even if error
      if (axiosError.response.status < 500) {
        status = "active";
      }
    } else {
      error = axiosError.message || "Unknown error";
    }

    // Update in database
    if (endpoint.id) {
      updateEndpointStatus(endpoint.id, status, responseTimeMs);
    }

    return {
      endpointId: endpoint.id || 0,
      url: endpoint.url,
      status,
      responseTimeMs,
      checkedAt: new Date().toISOString(),
      error,
    };
  }
}

/**
 * Validate multiple endpoints with concurrency control.
 */
export async function validateEndpoints(
  endpoints: AiApiEndpoint[],
  onProgress?: (current: number, total: number, result: ValidationResult) => void
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const maxConcurrent = config.scraper.maxConcurrent;

  // Process in batches
  for (let i = 0; i < endpoints.length; i += maxConcurrent) {
    const batch = endpoints.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map((ep) => validateEndpoint(ep))
    );

    for (const result of batchResults) {
      results.push(result);
      if (onProgress) {
        onProgress(results.length, endpoints.length, result);
      }
    }

    // Delay between batches
    if (i + maxConcurrent < endpoints.length) {
      await sleep(config.scraper.delayMs);
    }
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
