# DictionAI - Todo

## Goal
Aplikasi Node.js untuk mengumpulkan, memvalidasi, dan mengkategorikan free AI API endpoints dari berbagai sumber.

## Tech Stack
- Runtime: Node.js + TypeScript
- HTTP: axios (with retry)
- HTML Parsing: cheerio
- Database: node:sqlite (built-in — no native build needed)
- CLI: commander
- Web UI: Express + EJS
- Config: dotenv

## Architecture

```
ai-api-scrapper/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── scrapers/
│   │   ├── github-lists.ts   # Scrape awesome-* repos
│   │   ├── api-directory.ts  # Scrape API directories
│   │   └── index.ts          # Scraper runner
│   ├── validators/
│   │   └── endpoint.ts       # Health check endpoints
│   ├── categorizer/
│   │   └── categorize.ts     # Categorize endpoints
│   ├── storage/
│   │   └── db.ts             # SQLite storage
│   ├── types.ts              # Type definitions
│   ├── config.ts             # Configuration
│   ├── seed.ts               # Known free AI APIs seed data
│   ├── export.ts             # JSON/CSV export
│   └── web/
│       ├── server.ts         # Express server
│       ├── routes.ts         # API routes
│       └── views/            # EJS templates
├── data/                     # Export output
├── scripts/                  # Build helpers + smoke test
├── package.json
├── tsconfig.json
└── .env.example
```

## Todo List

### Phase 1: Project Setup
- [x] Create md/todo.md
- [x] Initialize package.json + dependencies
- [x] Setup TypeScript config
- [x] Create type definitions (types.ts)
- [x] Create config (.env.example + config.ts)
- [x] Create SQLite storage layer (node:sqlite — better-sqlite3 dibatalkan karena gagal native build di Windows)

### Phase 2: Scrapers
- [x] GitHub lists scraper (zukixa/cool-ai-stuff, OuterSpacee/free-ai-apis, YoannDev90/awesome-free-ai-api)
- [x] API directory scraper (public-apis ML + Text Analysis sections)
- [x] Scraper runner/registry
- [x] Filter badge/junk URLs (img.shields.io, repobeats, social links)

### Phase 3: Validation & Categorization
- [x] Endpoint health checker (HTTP HEAD, concurrency 5, timeout 10s)
- [x] Auto-categorizer (text, image, embedding, audio, translation, search, other)
- [x] Auth-required flag with notes

### Phase 4: CLI
- [x] Scrape command (--source filter)
- [x] Validate command (--all, --category, --status; default: yang belum dicek 24 jam)
- [x] Export command (JSON/CSV, --category, --status, --output)
- [x] List command (--category, --status, --search, --provider, --auth/--no-auth, --json)
- [x] Stats command
- [x] Seed command (28 API free terkenal)

### Phase 5: Web UI
- [x] Express server setup (auto-listen saat dijalankan langsung)
- [x] Dashboard page (stats, filter, search, list endpoint)
- [x] Filter tag (dropdown + klik tag di kartu endpoint) + CLI `list --tag`
- [x] Endpoint detail page
- [x] REST API (stats, list, validate, validate-all, scrape, export, delete)
- [x] Export from web UI
- [x] Static CSS + toast notifications
- [x] Smoke test (scripts/test-web.js)

### Phase 6: AI Model Tester Integration (2026-09-09)
- [x] Vendor `model-tester` (D:\Project\nodejs\model-tester) ke `tools/model-tester/` (server.js + public/ + LICENSE + README + vercel.json)
- [x] Guard listen tester: `require.main === module` (bukan NODE_ENV) agar tidak konflik port saat di-mount
- [x] API paths di `public/index.html` diubah ke relatif (`api/...`) agar kompatibel dengan prefix `/tester/`
- [x] Mount sebagai sub-app Express di `/tester/` + redirect `/tester` → `/tester/` (src/web/tester.ts + server.ts)
- [x] Link navbar "🧪 Tester" di dashboard + detail page
- [x] Dependency `openai ^4.50.0` + script `npm run tester` (standalone)
- [x] Smoke test route `/tester/` + POST /tester/api/models
- [x] Tombol "🧪 Test" per endpoint (dashboard + detail) — pre-fill URL tester via localStorage
- [x] README section Model Tester

## Categories
- 🤖 Text Generation (ChatGPT-compatible, Llama, etc.)
- 🎨 Image Generation (Stable Diffusion, Flux, etc.)
- 🗣️ Audio/TTS/STT (Whisper, Bark, etc.)
- 📐 Embeddings (OpenAI embeddings, Sentence Transformers)
- 🌐 Translation (NLLB, MADLAD)
- 🔍 Search/RAG
- 📊 Other

## Source Priority
1. GitHub Awesome Lists ✓
2. Public API directories ✓
3. Custom config (user-addable) — tambah entry di `config.sources.githubLists`

## Decisions
- Auth handling: Include APIs that need auth, marked with `requiresAuth: true` + notes ✓
- No auto-scrape/cron — manual run only ✓
- Web UI included alongside CLI ✓
- Database: `node:sqlite` (gosong native build `better-sqlite3` di Node 26)

## Validation Status (2026-09-08)
- Total endpoint di DB: 156
- ✅ Active: 128
- ❌ Dead: 15
- ❓ Unknown: 13
- Sumber: zukixa/cool-ai-stuff (9), OuterSpacee/free-ai-apis (32), YoannDev90/awesome-free-ai-api (36), public-apis (55), seed (28, sebagian dedupe)