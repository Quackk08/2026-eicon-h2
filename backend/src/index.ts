import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { env } from "./config/env.js";
import profilesRouter from "./routes/profiles.js";
import visionsRouter from "./routes/visions.js";
import routesRouter from "./routes/routes.js";
import checkInsRouter from "./routes/checkIns.js";
import recommendationsRouter from "./routes/recommendations.js";
import missionsRouter from "./routes/missions.js";
import placesRouter from "./routes/places.js";
import communityRouter from "./routes/community.js";
import insightsRouter from "./routes/insights.js";

const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "26e-icon-api"
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

// Express 5 forwards rejected async handlers here automatically.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "internal server error" });
});

app.listen(env.port, () => {
  console.log(`API server listening on http://localhost:${env.port}`);
});
