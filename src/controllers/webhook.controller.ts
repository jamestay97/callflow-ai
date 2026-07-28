import type { Request, Response } from "express";
import { forwardToMake } from "../services/make.service.js";
import { vapiToolCallsHandler } from "../controllers/tools.controller.js";
import {
  isVapiEndOfCallReport,
  isVapiServerEvent,
  normalizeCallEndedPayload,
} from "../services/voiceWebhook.service.js";
import { clearConversationState, resolveSessionKey } from "../state/conversationState.js";
import { logger } from "../utils/logger.js";

export async function callEndedHandler(req: Request, res: Response): Promise<void> {
  if (!req.tenant) {
    res.status(500).json({ error: "Tenant context missing" });
    return;
  }

  const body = req.body as Record<string, unknown>;

  if (isVapiServerEvent(body) && !isVapiEndOfCallReport(body)) {
    res.status(200).json({});
    return;
  }

  const payload = normalizeCallEndedPayload(
    req.tenant,
    body,
    req.header("x-voice-engine") === "callsphere" ? "callsphere" : "direct",
  );

  if (!payload) {
    res.status(400).json({
      error: "Invalid call-ended payload",
      hint: "Expected Vapi end-of-call-report or a direct call summary body with callId/transcript.",
    });
    return;
  }

  clearConversationState(resolveSessionKey(req.tenant.id, req));

  try {
    const makeResult = await forwardToMake(req.tenant, payload);
    res.status(200).json({
      received: true,
      tenant: req.tenant.slug,
      callId: payload.call.id,
      make: makeResult,
    });
  } catch (error) {
    logger.error("call-ended Make.com forward failed", {
      tenant: req.tenant.slug,
      callId: payload.call.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(502).json({
      error: "Call received but post-call automation failed",
      tenant: req.tenant.slug,
      callId: payload.call.id,
    });
  }
}

export async function voiceServerHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const message = body.message as { type?: string } | undefined;

  switch (message?.type) {
    case "end-of-call-report":
      await callEndedHandler(req, res);
      return;
    case "tool-calls":
      await vapiToolCallsHandler(req, res);
      return;
    default:
      res.status(200).json({});
  }
}
