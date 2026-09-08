# 📖 DictionAI

> The dictionary of free AI APIs

Aplikasi Node.js/TypeScript untuk **mengumpulkan, memvalidasi, dan mengkategorikan free AI API endpoints** dari berbagai sumber — GitHub awesome lists dan direktori API publik.

## ✨ Fitur

- 🔍 **Scraping otomatis** dari GitHub awesome lists + public-apis directory
- ✅ **Validasi live** — health-check setiap endpoint (HTTP HEAD, response time)
- 🏷️ **Auto-kategorisasi** — Text Gen, Image Gen, Audio/TTS/STT, Embeddings, Translation, Search/RAG
- 🔐 **Deteksi auth** — termasuk API yang butuh API key (ditandai + catatan)
- 💾 **SQLite storage** — no native dependencies (pakai `node:sqlite` bawaan Node)
- 📄 **Export JSON/CSV**
- 🌐 **Web UI dashboard** dengan filter, search, dan aksi langsung
- 🧪 **AI Model Tester** terintegrasi — tes endpoint & API key langsung dari `/tester/` (chat, tools, vision, streaming, compare)
- 💻 **CLI lengkap** untuk semua operasi

## 📋 Persyaratan

- Node.js **≥ 24** (menggunakan modul bawaan `node:sqlite`, tersedia sejak v22.5)
- Tidak butuh Python / native build tools

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy .env (opsional, semua punya default)
copy .env.example .env

# 3. Build TypeScript
npm run build

# 4. Seed DB dengan API terkenal (langsung bisa pakai tanpa scraping)
npm run seed

# 5. Scrape dari semua sumber
npm run scrape

# 6. Validasi semua endpoint (butuh koneksi internet)
npm run validate -- --all

# 7. Jalankan Web UI
npm run web
#    Buka http://localhost:3000
```

## 🎮 CLI Commands

| Command | Deskripsi |
|---------|-----------|
| `npm run stats` | Statistik database (total, aktif, mati, per kategori) |
| `npm run scrape` | Scrape dari GitHub lists + API directories |
| `npm run scrape -- --source github-lists` | Scrape hanya satu sumber |
| `npm run validate` | Validasi endpoint yang belum dicek (>24 jam) |
| `npm run validate -- --all` | Validasi SEMUA endpoint |
| `npm run validate -- --category text-generation` | Validasi per kategori |
| `npm run export -- --format json` | Export JSON |
| `npm run export -- --format csv --category image-generation` | Export CSV per kategori |
| `npm run list` | List semua endpoint |
| `npm run list -- --category text-generation --status active --auth` | List dengan filter |
| `npm run seed` | Seed dengan API free terkenal |
| `npm run tester` | Jalanin Model Tester standalone di port 3000 |

## 🌐 Web UI

```
npm run web
```

Dashboard di `http://localhost:3000`:

- Stat card: total / active / dead / unknown
- Filter kategori, status, dan search
- List endpoint dengan badge status, auth, response time, tags
- Tombol aksi: **Scrape Now**, **Validate All**, **Validate per endpoint**, **Export JSON/CSV**, **Delete**
- Detail page per endpoint
- Link navbar **🧪 Tester** → buka `http://localhost:3000/tester/`

### 🔬 AI Model Tester (`/tester/`)

Tool tes AI endpoint & API key yang di-vendor dari project `model-tester` ke `tools/model-tester/`, di-mount sebagai sub-app di `/tester/`:

- **Tester** — chat ke endpoint OpenAI-compatible, Anthropic, atau Gemini dengan metric TTFT, latency, TPS, token
- **Chat** — streaming chat penuh dengan preset (OpenRouter, Groq, Together, Ollama, LM Studio, vLLM)
- **Compat** — uji kemampuan model: `chat`, `tools`, `json`, `stream`, `vision` (deteksi rate-limit/quota)
- **Compare** — bandingkan 2 model side-by-side
- **History** — riwayat percobaan (localStorage)

Bisa juga dijalankan standalone:

```bash
npm run tester
# buka http://localhost:3000 (ganti PORT env jika bentrok)
```

### REST API

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/stats` | GET | Statistik |
| `/api/endpoints` | GET | List (filter via query: `category`, `status`, `search`, `provider`, `requiresAuth`) |
| `/api/endpoints/:id` | GET | Detail endpoint |
| `/api/endpoints/:id` | DELETE | Hapus endpoint |
| `/api/scrape` | POST | Jalankan scraping (body: `{"sources": ["github-lists"]}`) |
| `/api/validate/:id` | POST | Validasi satu endpoint |
| `/api/validate-all` | POST | Validasi semua (body: `{"category": "..."}`) |
| `/api/export` | POST | Export (body: `{"format": "json"}`) |

## 🗂️ Struktur Proyek

```
src/
├── index.ts                  # CLI entry point (commander)
├── config.ts                 # Konfigurasi + daftar sumber
├── seed.ts                   # Data seed API free terkenal
├── types.ts                  # Type definitions
├── export.ts                 # Export JSON/CSV
├── scrapers/
│   ├── index.ts              # Scraper runner
│   ├── github-lists.ts       # Scrape GitHub awesome lists (README markdown parsing)
│   └── api-directory.ts      # Scrape public-apis (tabel markdown parsing)
├── validators/
│   └── endpoint.ts           # Health-check HTTP dengan concurrency control
├── categorizer/
│   └── categorize.ts         # Auto-kategorisasi + deteksi auth (keyword-based)
├── storage/
│   └── db.ts                 # node:sqlite storage layer (upsert, query, stats)
├── web/
│   ├── server.ts             # Express app (listen hanya saat dijalankan langsung)
│   ├── routes.ts             # Web pages + REST API
│   ├── tester.ts             # Mount model-tester (tools/model-tester) di /tester/
│   └── views/                # EJS templates + CSS
tools/
└── model-tester/             # Vendor AI Model Tester (server.js + public/ + LICENSE)
```

## ⚙️ Konfigurasi (.env)

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `DATABASE_PATH` | `./data/ai_apis.db` | Lokasi database |
| `SCRAPE_DELAY_MS` | `1000` | Delay antar request (anti-ban) |
| `MAX_CONCURRENT` | `5` | Request paralel saat validasi |
| `REQUEST_TIMEOUT_MS` | `10000` | Timeout per request |
| `WEB_PORT` | `3000` | Port web UI |
| `WEB_HOST` | `localhost` | Host web UI |
| `GITHUB_TOKEN` | *(kosong)* | Token GitHub opsional (rate limit lebih tinggi) |
| `EXPORT_DIR` | `./data/exports` | Folder hasil export |

## 🔧 Cara Kerja

1. **Scrape** — baca markdown dari GitHub repos & public-apis, ekstrak link via regex
2. **Filter** — hanya URL yang terlihat seperti API (bukan badge, social, docs)
3. **Kategorisasi** — pencocokan keyword (chat, image, whisper, translation, dll)
4. **Deteksi auth** — deteksi pola `api key`, `token`, `oauth`, atau `no auth`
5. **Upsert** — simpan ke SQLite (dedupe via URL unik)
6. **Validasi** — HTTP HEAD ke setiap endpoint, update status active/dead + response time
7. **Export** — JSON/CSV dengan filter opsional

## 🧪 Testing

```bash
node scripts/test-web.js   # Smoke test web UI (default port 3456)
```

## 📌 Catatan

- Port `3000` sering dipakai app lain — jika bentrok, ganti `WEB_PORT` di `.env`.
- Endpoint yang butuh auth tetap **disimpan** (bukan di-skip) dengan flag `requiresAuth: true` + catatan.
- Beberapa endpoint dengan kategori "other" adalah API umum yang terdeteksi dari section AI public-apis — bisa di-refine manual lewat web UI.