// Copies web view templates and static assets from src to dist after build.
// (tsc only compiles .ts files; .ejs/.css need manual copying)
const fs = require("fs");
const path = require("path");

const srcViews = path.join(__dirname, "..", "src", "web", "views");
const distViews = path.join(__dirname, "..", "dist", "web", "views");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(srcViews, distViews);
console.log("✅ Copied web views to dist");