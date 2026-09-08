import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  root: ".",
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "DictionAI - The dictionary of free AI APIs",
        short_name: "DictionAI",
        description: "Scrape, validate, and catalog free AI API endpoints",
        theme_color: "#6c5ce7",
        background_color: "#0b0b12",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        // /tester is the vendored Model Tester sub-app — never serve the SPA
        // shell for its navigation requests.
        navigateFallbackDenylist: [/^\/tester/],
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        globIgnores: ["**/sw.js", "**/workbox-*.js"],
      },
    }),
  ],
  build: {
    outDir: "../dist/www",
    emptyOutDir: true,
  },
});