import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Refuses to produce a production build that cannot sign anyone in.
 *
 * Vite inlines `import.meta.env.VITE_*` at build time, so a deploy whose
 * environment is missing them does not fail — it quietly ships an app where
 * every sign-in attempt answers "not configured in this build". That is
 * exactly what happened: the deployed site had no credentials, the build
 * was green, and nothing anywhere said so until someone tried to log in.
 *
 * Guest-only is a legitimate build, so this is not a blanket ban — it just
 * has to be deliberate. Setting VITE_ALLOW_NO_AUTH=true says "yes, I mean
 * to ship this without accounts", and the difference between that and an
 * accident is the whole point.
 */
function requireAuthCredentials(mode: string): Plugin {
  return {
    name: "renew:require-auth-credentials",
    apply: "build",
    configResolved() {
      const env = loadEnv(mode, process.cwd(), "VITE_");
      const missing = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"].filter(
        (name) => !env[name]
      );
      if (missing.length === 0) return;

      if (env.VITE_ALLOW_NO_AUTH === "true") {
        console.warn(
          `\n[renew] Building without ${missing.join(" and ")}.` +
            `\n[renew] Sign-in will be unavailable; guest mode still works.\n`
        );
        return;
      }

      throw new Error(
        `\n\n[renew] Refusing to build: ${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} missing.\n` +
          `        Vite inlines these at build time, so this build would ship with sign-in\n` +
          `        permanently disabled and no way to tell from the outside.\n\n` +
          `        Set them in the build environment (on Vercel: Settings -> Environment\n` +
          `        Variables, then redeploy — existing builds do not pick them up), or set\n` +
          `        VITE_ALLOW_NO_AUTH=true if a guest-only build is what you intend.\n`
      );
    }
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    requireAuthCredentials(mode),
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

        /*
         * The on-device model library is 6MB of JavaScript and must never be
         * precached: it is opt-in precisely so that people who do not want
         * it never download it, and precaching would hand it to everyone on
         * their first visit. Anyone who does turn it on fetches this chunk
         * then, which is also when they agree to the far larger weights.
         */
        globIgnores: ["**/webllm-*.js"],

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
  build: {
    rollupOptions: {
      output: {
        // Named rather than left to a content hash so the service worker can
        // exclude it by pattern. Without a stable name the 6MB library
        // silently rejoins the precache the next time its hash changes.
        manualChunks(id: string) {
          if (id.includes("@mlc-ai/web-llm")) return "webllm";
          return undefined;
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true
      }
    }
  }
}));

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
