import rateLimit from "express-rate-limit";
import { isProduction } from "../config/env.js";

export const apiRateLimiter = rateLimit({
  windowMs: 60_000,
  max: isProduction() ? 120 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

export const webhookRateLimiter = rateLimit({
  windowMs: 60_000,
  max: isProduction() ? 60 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many webhook requests" },
});
