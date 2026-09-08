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

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
app.use("/static", express.static(path.join(__dirname, "views", "static")));

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

// Routes
app.use("/", createRoutes());

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