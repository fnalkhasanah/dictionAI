import express from "express";
import path from "path";
import { config } from "../config";
import { createRoutes } from "./routes";
import { initDatabase } from "../storage/db";
import testerApp from "./tester";

const app = express();
const PORT = config.web.port;
const HOST = config.web.host;

// Initialize database
initDatabase();

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// AI Model Tester — vendored in tools/model-tester, mounted as a sub-app.
// Redirect /tester -> /tester/ so the tester's relative API paths (`api/...`)
// resolve to /tester/api/... instead of /api/...
// NOTE: use a regex route — Express non-strict routing makes the string
// route "/tester" also match "/tester/", which would loop forever.
app.get(/^\/tester$/, (req, res) => res.redirect("/tester/"));
app.use("/tester", testerApp);

// REST API (dashboard/data routes)
app.use("/", createRoutes());

// PWA / SPA frontend (built by Vite into dist/www)
const WWW_DIR = path.join(__dirname, "..", "..", "dist", "www");
app.use(express.static(WWW_DIR));

// SPA fallback: any GET that is not an API/tester path gets the app shell so
// client-side routes (/ and /endpoint/:id) work on refresh.
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api/") && !req.path.startsWith("/tester")) {
    return res.sendFile(path.join(WWW_DIR, "index.html"));
  }
  next();
});

// Only start the HTTP server when this file is executed directly
// (e.g. `npm run web` or `node dist/web/server.js`).
// When imported (e.g. by tests), the caller controls when to listen.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🌐 DictionAI Web UI`);
    console.log(`   http://${HOST}:${PORT}`);
    console.log(`\n   Press Ctrl+C to stop.\n`);
  });
}

export default app;
export { app };