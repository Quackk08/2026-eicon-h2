import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      /*
       * The app shell is precached so ReNew opens with no network at all.
       * Until this existed the offline story only held for a tab that was
       * already open: IndexedDB kept every Check-In and Reflection safe,
       * but a cold start on a train had nothing to load and showed a blank
       * page — which is the one situation the product promises to survive.
       */
      registerType: "autoUpdate",
      manifest: {
        name: "ReNew",
        short_name: "ReNew",
        description:
          "Connect the life you want with an action that feels possible today and the real places around you.",
        lang: "en",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#12211a",
        theme_color: "#12211a",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        // Extensions, not paths: this leaves the 11.5MB of hero and place
        // videos and the place photographs out of the precache, which
        // would otherwise be downloaded in full on first visit.
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],

        // Client-side routing: /app/today has no file behind it.
        navigateFallback: "/index.html",
        // ...but an API path must never be answered with the HTML shell,
        // or a 404 from the backend arrives at the client as a page.
        navigateFallbackDenylist: [/^\/api\//],

        runtimeCaching: [
          {
            /*
             * Photographs of reviewed places, kept once seen so a place
             * someone looked up is still recognisable offline. Cache-first
             * because these are immutable: a different photo would be a
             * different file.
             */
            urlPattern: /\/places\/[^/]+\.jpg$/,
            handler: "CacheFirst",
            options: {
              cacheName: "renew-place-photos",
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true
      }
    }
  }
});

/*
 * There is deliberately no runtime cache for /api.
 *
 * A service worker intercepts fetches regardless of `cache: "no-store"`, so
 * a cached /api/health would make isServerReachable() answer true while the
 * device is offline — the header would claim "Synced" as writes piled up in
 * the outbox. Data offline comes from IndexedDB, which is the one copy that
 * is actually up to date; requests are left to reach the network and fail
 * honestly when they cannot.
 */
