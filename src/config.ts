import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const config = {
  database: {
    path: process.env.DATABASE_PATH || path.join(__dirname, "..", "data", "ai_apis.db"),
  },
  scraper: {
    delayMs: parseInt(process.env.SCRAPE_DELAY_MS || "1000", 10),
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT || "5", 10),
    requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || "10000", 10),
  },
  web: {
    port: parseInt(process.env.WEB_PORT || "3000", 10),
    host: process.env.WEB_HOST || "localhost",
  },
  github: {
    token: process.env.GITHUB_TOKEN || "",
  },
  export: {
    dir: process.env.EXPORT_DIR || path.join(__dirname, "..", "data", "exports"),
  },
  // Known free AI API sources to scrape
  sources: {
    githubLists: [
      {
        owner: "zukixa",
        repo: "cool-ai-stuff",
        path: "README.md",
      },
      {
        owner: "OuterSpacee",
        repo: "free-ai-apis",
        path: "README.md",
      },
      {
        owner: "YoannDev90",
        repo: "awesome-free-ai-api",
        path: "README.md",
      },
    ],
  },
};

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "text-generation": [
    "chat",
    "gpt",
    "llm",
    "language model",
    "text generation",
    "completion",
    "llama",
    "mistral",
    "claude",
    "gemini",
    "palm",
    "openai",
    "anthropic",
    "cohere",
    "nlp",
    "text ai",
  ],
  "image-generation": [
    "image",
    "stable diffusion",
    "flux",
    "dalle",
    "midjourney",
    "imagen",
    "text to image",
    "image generation",
    "art",
    "drawing",
    "visual",
    "picture",
  ],
  "audio-tts-stt": [
    "audio",
    "tts",
    "stt",
    "speech",
    "voice",
    "whisper",
    "bark",
    "sound",
    "music",
    "transcri",
    "speak",
    "text to speech",
    "speech to text",
  ],
  embeddings: [
    "embedding",
    "vector",
    "sentence",
    "semantic",
    "similarity",
    "text to vector",
    "word2vec",
    "bert",
  ],
  translation: [
    "translat",
    "language translate",
    "nllb",
    "madlad",
    "multilingual",
    "i18n",
  ],
  "search-rag": [
    "search",
    "rag",
    "retrieval",
    "knowledge",
    "qa",
    "question answering",
    "fact check",
  ],
};
