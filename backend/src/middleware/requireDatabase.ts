import type { NextFunction, Request, Response } from "express";
import { isDatabaseConfigured, missingDatabaseEnv } from "../config/env.js";

/**
 * Turns away anything that needs the database when this server has no
 * credentials for one.
 *
 * 503 rather than 500: the request was fine and the same request will work
 * once the deployment is configured. Naming the absent variables is the
 * point — the failure this replaces was indistinguishable from the server
 * being down.
 */
export function requireDatabase(_req: Request, res: Response, next: NextFunction) {
  if (isDatabaseConfigured()) return next();

  return res.status(503).json({
    error: "this server is not configured to reach its database",
    missingEnv: missingDatabaseEnv()
  });
}
