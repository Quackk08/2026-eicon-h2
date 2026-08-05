import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  ConfigurationError,
  env,
  isAIEnabled,
  isDatabaseConfigured,
  missingDatabaseEnv
} from "./config/env.js";
import { requireDatabase } from "./middleware/requireDatabase.js";
import profilesRouter from "./routes/profiles.js";
import visionsRouter from "./routes/visions.js";
import routesRouter from "./routes/routes.js";
import checkInsRouter from "./routes/checkIns.js";
import recommendationsRouter from "./routes/recommendations.js";
import missionsRouter from "./routes/missions.js";
import placesRouter from "./routes/places.js";
import communityRouter from "./routes/community.js";
import insightsRouter from "./routes/insights.js";
import actionTemplatesRouter from "./routes/actionTemplates.js";
import authRouter from "./routes/auth.js";
import savedPlacesRouter from "./routes/savedPlaces.js";
import supportRouter from "./routes/support.js";
import syncRouter from "./routes/sync.js";

/**
 * The Express app on its own, with no server attached.
 *
 * Local development listens on a port (src/index.ts); the deployed build
 * hands this straight to a serverless function (api/index.js), which never
 * calls listen. Keeping the two apart means both run the same routes.
 */
const app = express();

// Same-origin in production — the frontend and this API are served from one
// domain — so CORS only matters for the local Vite dev server on :5173.
app.use(cors({ origin: env.clientOrigin }));
// Photo verification posts a downscaled image as base64; everything else
// stays far below even the old 100kb default.
app.use(express.json({ limit: "3mb" }));

/**
 * Reports what this deployment is actually able to do, which is otherwise
 * invisible: with no Gemini key, or a model whose quota is spent, ladders
 * silently fall back to reviewed seed steps and every Vision gets the same
 * five actions — and with no database credentials, every other route fails
 * with nothing to distinguish it from the server being down.
 *
 * Only names and booleans are exposed — never a key or a URL.
 *
 * `ok` stays true for a server that is running but unconfigured. It answers
 * "is this process alive", and conflating that with "is it configured"
 * would make an unconfigured deployment look like a dead one again.
 */
app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "26e-icon-api",
    databaseConfigured: isDatabaseConfigured(),
    missingEnv: missingDatabaseEnv(),
    aiEnabled: isAIEnabled(),
    geminiModel: isAIEnabled() ? env.geminiModel : null
  });
});

// Everything below this line touches the database. Health is deliberately
// above it, so the endpoint that explains a misconfiguration is the one
// endpoint a misconfiguration cannot take out.
app.use("/api", requireDatabase);

app.use("/api", profilesRouter);
app.use("/api", visionsRouter);
app.use("/api", routesRouter);
app.use("/api", checkInsRouter);
app.use("/api", recommendationsRouter);
app.use("/api", missionsRouter);
app.use("/api", placesRouter);
app.use("/api", communityRouter);
app.use("/api", insightsRouter);
app.use("/api", actionTemplatesRouter);
app.use("/api", authRouter);
app.use("/api", savedPlacesRouter);
app.use("/api", supportRouter);
app.use("/api", syncRouter);

// Express 5 forwards rejected async handlers here automatically.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // Only the message: an error object can carry the request that produced
  // it, and Check-In text, notes, and contacts must never reach a log
  // (docs/PRODUCT_GUARDRAILS.md).
  console.error("Unhandled error:", err instanceof Error ? err.message : "non-error thrown");
  if (res.headersSent) return;

  // A backstop for anything that reached the Supabase client without
  // passing requireDatabase. Same 503 and same wording as the middleware,
  // so the two cannot disagree about what is wrong.
  if (err instanceof ConfigurationError) {
    return res.status(503).json({
      error: "this server is not configured to reach its database",
      missingEnv: err.missing
    });
  }

  res.status(500).json({ error: "internal server error" });
});

export default app;
