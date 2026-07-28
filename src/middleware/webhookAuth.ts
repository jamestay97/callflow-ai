import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { ConfigError } from "../utils/errors.js";

/**
 * Optional shared-secret verification for voice platform webhooks.
 * Vapi: set `VAPI_WEBHOOK_SECRET` and send it as `x-vapi-secret` header.
 * CallSphere: set `CALLSPHERE_WEBHOOK_SECRET` and send as `x-callsphere-secret`.
 */
export function verifyVoiceWebhook(req: Request, res: Response, next: NextFunction): void {
  const vapiSecret = env.VAPI_WEBHOOK_SECRET;
  const callsphereSecret = env.CALLSPHERE_WEBHOOK_SECRET;

  if (!vapiSecret && !callsphereSecret) {
    next();
    return;
  }

  const headerSecret =
    req.header("x-vapi-secret") ??
    req.header("x-callsphere-secret") ??
    req.header("authorization")?.replace(/^Bearer\s+/i, "");

  const expected =
    env.VOICE_ENGINE === "callsphere" ? callsphereSecret : vapiSecret ?? callsphereSecret;

  if (expected && headerSecret !== expected) {
    console.warn("[webhook] Rejected request — invalid webhook secret");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

export function webhookErrorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error("[webhook]", error);

  if (error instanceof ConfigError) {
    res.status(503).json({ error: error.userMessage });
    return;
  }

  res.status(500).json({
    error: "Webhook processing failed",
    message: env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
  });
}
