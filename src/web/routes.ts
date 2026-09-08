import { Router, Request, Response } from "express";
import {
  getEndpoints,
  getEndpointById,
  getStats,
  getAllTags,
  deleteEndpoint,
} from "../storage/db";
import { runScrapers } from "../scrapers";
import { validateEndpoint, validateEndpoints } from "../validators/endpoint";
import { exportData } from "../export";
import { ApiCategory, ApiStatus } from "../types";

export function createRoutes(): Router {
  const router = Router();

  // ==========================================
  // API Routes (JSON)
  // ==========================================

  // List endpoints
  router.get("/api/endpoints", (req: Request, res: Response) => {
    const endpoints = getEndpoints({
      category: req.query.category as ApiCategory,
      status: req.query.status as ApiStatus,
      search: req.query.search as string,
      provider: req.query.provider as string,
      tag: req.query.tag as string,
      requiresAuth: req.query.requiresAuth === "true"
        ? true
        : req.query.requiresAuth === "false"
        ? false
        : undefined,
    });

    res.json({
      total: endpoints.length,
      endpoints,
    });
  });

  // Get single endpoint
  router.get("/api/endpoints/:id", (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const endpoint = getEndpointById(id);

    if (!endpoint) {
      return res.status(404).json({ error: "Endpoint not found" });
    }

    res.json(endpoint);
  });

  // Delete endpoint
  router.delete("/api/endpoints/:id", (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const deleted = deleteEndpoint(id);

    if (!deleted) {
      return res.status(404).json({ error: "Endpoint not found" });
    }

    res.json({ success: true });
  });

  // Stats
  router.get("/api/stats", (req: Request, res: Response) => {
    const stats = getStats();
    res.json(stats);
  });

  // All tags with counts (for the filter dropdown)
  router.get("/api/tags", (req: Request, res: Response) => {
    res.json(getAllTags());
  });

  // Scrape
  router.post("/api/scrape", async (req: Request, res: Response) => {
    try {
      const sources = req.body.sources as ("github-lists" | "api-directory")[] | undefined;
      const results = await runScrapers({ sources });

      const totalEndpoints = results.reduce((sum, r) => sum + r.endpoints.length, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

      res.json({
        success: true,
        totalEndpoints,
        totalErrors,
        results: results.map((r) => ({
          source: r.source,
          endpoints: r.endpoints.length,
          errors: r.errors,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: `Scrape failed: ${err}` });
    }
  });

  // Validate single endpoint
  router.post("/api/validate/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const endpoint = getEndpointById(id);

      if (!endpoint) {
        return res.status(404).json({ error: "Endpoint not found" });
      }

      const result = await validateEndpoint(endpoint);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: `Validation failed: ${err}` });
    }
  });

  // Validate all (or filtered)
  router.post("/api/validate-all", async (req: Request, res: Response) => {
    try {
      const endpoints = getEndpoints({
        category: req.body.category,
        status: req.body.status,
      });

      const results = await validateEndpoints(endpoints);
      const active = results.filter((r) => r.status === "active").length;
      const dead = results.filter((r) => r.status === "dead").length;

      res.json({
        success: true,
        total: results.length,
        active,
        dead,
      });
    } catch (err) {
      res.status(500).json({ error: `Validation failed: ${err}` });
    }
  });

  // Export
  router.post("/api/export", async (req: Request, res: Response) => {
    try {
      const format = (req.body.format as "json" | "csv") || "json";
      const outputPath = await exportData({
        format,
        category: req.body.category,
        status: req.body.status,
      });

      res.json({
        success: true,
        path: outputPath,
      });
    } catch (err) {
      res.status(500).json({ error: `Export failed: ${err}` });
    }
  });

  return router;
}
