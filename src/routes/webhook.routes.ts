import { Router } from "express";
import { callEndedHandler, voiceServerHandler } from "../controllers/webhook.controller.js";
import { loadTenantFromParam } from "../middleware/tenantContext.js";
import { verifyTenantVoiceWebhook } from "../middleware/platformAuth.js";
import { webhookErrorHandler } from "../middleware/webhookAuth.js";

export const webhookRouter = Router();

/** Per-tenant webhooks — configure in Vapi as https://your-domain.com/webhook/{slug}/voice */
webhookRouter.post(
  "/:tenantSlug/voice",
  loadTenantFromParam("tenantSlug"),
  verifyTenantVoiceWebhook,
  voiceServerHandler,
);

webhookRouter.post(
  "/:tenantSlug/call-ended",
  loadTenantFromParam("tenantSlug"),
  verifyTenantVoiceWebhook,
  callEndedHandler,
);

webhookRouter.use(webhookErrorHandler);
