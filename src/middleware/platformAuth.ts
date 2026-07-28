import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/** Platform operator authentication for /admin/* routes. */
export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction): void {
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

export function verifyTenantVoiceWebhook(req: Request, res: Response, next: NextFunction): void {
  const tenant = req.tenant;
  if (!tenant) {
    res.status(500).json({ error: "Tenant context missing" });
    return;
  }

  const tenantSecret = tenant.integrations.vapiWebhookSecret;
  const platformSecret =
    tenant.integrations.voiceEngine === "callsphere"
      ? env.CALLSPHERE_WEBHOOK_SECRET
      : env.VAPI_WEBHOOK_SECRET;

  const expected = tenantSecret ?? platformSecret;

  if (!expected) {
    next();
    return;
  }

  const headerSecret =
    req.header("x-vapi-secret") ??
    req.header("x-callsphere-secret") ??
    req.header("authorization")?.replace(/^Bearer\s+/i, "");

  if (headerSecret !== expected) {
    logger.warn("webhook rejected — invalid secret", { tenant: tenant.slug });
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
