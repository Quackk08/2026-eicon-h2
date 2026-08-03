/**
 * Vercel serverless entry for the whole API.
 *
 * A catch-all ([...path]) rather than a rewrite, so the function receives
 * the real request path — /api/visions stays /api/visions — and the Express
 * routers, which are all mounted under /api, match unchanged.
 *
 * An Express app is already a (req, res) handler, so it can be exported
 * directly. It must not call listen() here; that is local development's job
 * (backend/src/index.ts).
 */
export { default } from "../backend/dist/app.js";
