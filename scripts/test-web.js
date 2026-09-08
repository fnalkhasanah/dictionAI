// Quick smoke test for the web UI.
// Imports the Express app directly (no child process), starts it on a test port,
// hits a few endpoints, then closes the server gracefully.
const path = require("path");

const TEST_PORT = parseInt(process.env.TEST_PORT || "3456", 10);

const { app } = require(path.resolve(__dirname, "..", "dist", "web", "server.js"));

const server = app.listen(TEST_PORT, async () => {
  try {
    const base = `http://localhost:${TEST_PORT}`;

    const dash = await fetch(`${base}/`);
    const dashHtml = await dash.text();
    console.log("GET / ->", dash.status, "| has title:", dashHtml.includes("DictionAI"));

    const stats = await fetch(`${base}/api/stats`);
    const statsJson = await stats.json();
    console.log("GET /api/stats ->", stats.status, "| total:", statsJson.total, "| active:", statsJson.active);

    const eps = await fetch(`${base}/api/endpoints?category=text-generation`);
    const epsJson = await eps.json();
    console.log("GET /api/endpoints ->", eps.status, "| text-gen count:", epsJson.total);

    const detail = await fetch(`${base}/endpoint/1`);
    const detailHtml = await detail.text();
    console.log("GET /endpoint/1 ->", detail.status, "| has name:", detailHtml.includes("OpenAI API"));

    const testerRedirect = await fetch(`${base}/tester`, { redirect: "manual" });
    console.log("GET /tester ->", testerRedirect.status, "| location:", testerRedirect.headers.get("location"));

    const testerPage = await fetch(`${base}/tester/`);
    const testerHtml = await testerPage.text();
    console.log("GET /tester/ ->", testerPage.status, "| has brand:", testerHtml.includes("AI Model Tester"));

    const testerApi = await fetch(`${base}/tester/api/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "http://localhost:1/v1", key: "test" }),
    });
    const testerApiJson = await testerApi.json();
    console.log("POST /tester/api/models ->", testerApi.status, "| responds:", "models" in testerApiJson || "error" in testerApiJson);

    const allOk =
      dash.status === 200 && dashHtml.includes("DictionAI") &&
      stats.status === 200 && statsJson.total >= 28 &&
      eps.status === 200 && epsJson.total >= 10 &&
      detail.status === 200 && detailHtml.includes("OpenAI API") &&
      testerRedirect.status === 302 && testerRedirect.headers.get("location") === "/tester/" &&
      testerPage.status === 200 && testerHtml.includes("AI Model Tester") &&
      testerApi.status === 200 && ("models" in testerApiJson || "error" in testerApiJson);

    console.log(allOk ? "WEB UI SMOKE TEST PASSED" : "WEB UI SMOKE TEST FAILED");
    // NOTE: use exitCode + graceful close instead of process.exit() to avoid a
    // libuv assertion on Windows with still-open keep-alive fetch connections.
    process.exitCode = allOk ? 0 : 1;
    server.close();
  } catch (err) {
    console.error("WEB UI TEST FAILED:", err.message);
    process.exitCode = 1;
    server.close();
  }
});