import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { env, isAIEnabled } from "./config/env.js";
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
 * Reports whether AI generation is configured, which is otherwise invisible:
 * with no key, or a model whose quota is spent, ladders silently fall back
 * to reviewed seed steps and every Vision gets the same five actions.
 *
 * Only the model name and a boolean are exposed — never the key itself.
 */
app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "26e-icon-api",
    aiEnabled: isAIEnabled(),
    geminiModel: isAIEnabled() ? env.geminiModel : null
  });
});

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
  console.error("Unhandled error:", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "internal server error" });
});

export default app;
