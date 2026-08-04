import app from "../backend/dist/app.js";

/**
 * Vercel serverless entry for the whole API.
 *
 * A filename catch-all (api/[...path].mjs) only ever matched one segment in
 * practice: /api/health worked while /api/places/search and
 * /api/visions/:id/route returned Vercel's own NOT_FOUND, so most of the API
 * was unreachable in production while every read that mattered fell back to
 * seed data with no error. Routing is now declared explicitly in
 * vercel.json instead.
 *
 * The rewrite carries the original path in __vercelPath. Whether the runtime
 * hands this function the original URL or the rewritten destination differs
 * by platform version, so both are handled: if the marker is present the
 * path is rebuilt from it, and if it is absent the URL already survived
 * intact. The Express routers are all mounted under /api either way.
 */
export default function handler(req, res) {
  const incoming = new URL(req.url ?? "/", "http://internal");
  const originalPath = incoming.searchParams.get("__vercelPath");

  if (originalPath !== null) {
    incoming.searchParams.delete("__vercelPath");
    const query = incoming.searchParams.toString();
    req.url = `/api${originalPath ? `/${originalPath}` : ""}${query ? `?${query}` : ""}`;
  }

  return app(req, res);
}
