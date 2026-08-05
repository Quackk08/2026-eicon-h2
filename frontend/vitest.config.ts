import { defineConfig } from "vitest/config";

/**
 * Deliberately separate from vite.config.ts: that one loads the PWA plugin,
 * which wants to generate a service worker and has no business running
 * during a unit test.
 *
 * Node environment, no DOM. What is worth testing here is the data layer —
 * the normalising, mapping, and date arithmetic where a mistake is silent
 * and permanent — not whether React renders a div.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
