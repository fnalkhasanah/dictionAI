import path from "path";

/**
 * AI Model Tester — a plain CommonJS Express app vendored in
 * tools/model-tester/ (github.com/BedMan95/no-cost-ai ecosystem tool).
 *
 * It only calls `listen()` when executed directly (require.main === module),
 * so it is safe to mount here regardless of NODE_ENV.
 *
 * Note: `__dirname` is resolved at runtime, so the path works both from
 * ts-node (src/web) and from compiled output (dist/web) — both sit one
 * level below the project root.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const testerApp = require(path.join(__dirname, "..", "..", "tools", "model-tester", "server.js"));

export default testerApp;