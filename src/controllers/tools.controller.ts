import type { Request, Response } from "express";
import {
  executeTool,
  isVoiceToolName,
  parseToolArguments,
} from "../services/toolExecutor.service.js";
import { resolveSessionKey } from "../state/conversationState.js";
import { requireTenant } from "../middleware/tenantContext.js";
import type { ToolResult } from "../types/toolResponse.js";
import { logger } from "../utils/logger.js";

function extractVapiToolCallArgs(toolCall: {
  arguments?: string | Record<string, unknown>;
  function?: { name?: string; arguments?: string | Record<string, unknown> };
}): Record<string, unknown> {
  if (toolCall.arguments !== undefined) {
    return parseToolArguments(toolCall.arguments);
  }
  return parseToolArguments(toolCall.function?.arguments);
}

function extractToolArgs(req: Request): Record<string, unknown> {
  const body = req.body as Record<string, unknown>;

  if (body.toolCallList && Array.isArray(body.toolCallList)) {
    const first = body.toolCallList[0] as {
      function?: { arguments?: string | Record<string, unknown> };
    };
    return parseToolArguments(first?.function?.arguments);
  }

  if (body.message && typeof body.message === "object") {
    const message = body.message as {
      toolCallList?: Array<{ function?: { arguments?: string | Record<string, unknown> } }>;
    };
    const first = message.toolCallList?.[0];
    return parseToolArguments(first?.function?.arguments);
  }

  return body;
}

function respond(res: Response, result: ToolResult): void {
  res.json(result);
}

async function runTool(req: Request, toolName: string): Promise<ToolResult> {
  if (!req.tenant) {
    return { success: false, message: "Business profile not found." };
  }

  const sessionKey = resolveSessionKey(req.tenant.id, req);

  if (!isVoiceToolName(toolName)) {
    return { success: false, message: "That action isn't available right now." };
  }

  return executeTool(req.tenant, sessionKey, toolName, extractToolArgs(req));
}

export async function checkCalendarAvailabilityHandler(req: Request, res: Response): Promise<void> {
  respond(res, await runTool(req, "check_calendar_availability"));
}

export async function bookAppointmentHandler(req: Request, res: Response): Promise<void> {
  respond(res, await runTool(req, "book_appointment"));
}

export async function sendPaymentLinkHandler(req: Request, res: Response): Promise<void> {
  respond(res, await runTool(req, "send_payment_link"));
}

/** Vapi tool-calls event — returns { results: [{ toolCallId, result }] } */
export async function vapiToolCallsHandler(req: Request, res: Response): Promise<void> {
  if (!req.tenant) {
    res.status(500).json({ error: "Tenant context missing" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const message = body.message as {
    toolCallList?: Array<{
      id: string;
      name?: string;
      arguments?: string | Record<string, unknown>;
      function?: { name?: string; arguments?: string | Record<string, unknown> };
    }>;
  };

  const toolCallList = message?.toolCallList ?? [];
  const sessionKey = resolveSessionKey(req.tenant.id, req);

  if (toolCallList.length > 0) {
    logger.info("vapi tool-calls", {
      tenant: req.tenant.slug,
      tools: toolCallList.map((t) => t.name ?? t.function?.name),
    });
  }

  const results = await Promise.all(
    toolCallList.map(async (toolCall) => {
      const name = toolCall.name ?? toolCall.function?.name ?? "";
      const args = extractVapiToolCallArgs(toolCall);

      let result: ToolResult;
      if (isVoiceToolName(name)) {
        result = await executeTool(req.tenant!, sessionKey, name, args);
      } else {
        result = { success: false, message: "That action isn't available right now." };
      }

      return {
        toolCallId: toolCall.id,
        result: result.message,
      };
    }),
  );

  res.json({ results });
}

export { requireTenant };
