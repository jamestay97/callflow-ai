import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

/** Protects admin-only routes (/api/prompt, /api/tools/schemas) in production. */
export function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  if (env.NODE_ENV !== "production") {
    next();
    return;
  }

  const provided =
    req.header("x-admin-key") ??
    req.header("authorization")?.replace(/^Bearer\s+/i, "");

  if (!env.ADMIN_API_KEY || provided !== env.ADMIN_API_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
