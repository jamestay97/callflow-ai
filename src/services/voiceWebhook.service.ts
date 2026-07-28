import { env } from "../config/env.js";
import type { CallEndedPayload, VapiWebhookBody } from "../types/callEnded.js";
import type { TenantRecord } from "../types/tenant.js";
import { getConversationState, scopedSessionKey } from "../state/conversationState.js";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function extractOutcomes(body: Record<string, unknown>): CallEndedPayload["outcomes"] {
  const outcomes: CallEndedPayload["outcomes"] = {};

  const toolResults = body.toolResults ?? body.outcomes;
  if (toolResults && typeof toolResults === "object") {
    Object.assign(outcomes, toolResults);
  }

  return outcomes;
}

function messagesFromArtifact(
  message?: VapiWebhookBody["message"],
): Array<{ role: string; message: string }> | undefined {
  const raw = message?.artifact?.messages ?? message?.messages;

  if (!Array.isArray(raw)) {
    return undefined;
  }

  return raw
    .map((entry) => ({
      role: asString(entry.role) ?? "unknown",
      message:
        asString(entry.message) ??
        asString("content" in entry ? (entry as { content?: string }).content : undefined) ??
        "",
    }))
    .filter((entry) => entry.message.length > 0);
}

export function normalizeCallEndedPayload(
  tenant: TenantRecord,
  body: Record<string, unknown>,
  source: CallEndedPayload["source"] = "direct",
): CallEndedPayload | null {
  const message = body.message as VapiWebhookBody["message"] | undefined;

  if (message?.type && message.type !== "end-of-call-report") {
    return null;
  }

  const effectiveSource: CallEndedPayload["source"] =
    message?.type === "end-of-call-report" ? "vapi" : source;

  const callObj = (message?.call ?? body.call ?? {}) as Record<string, unknown>;
  const customer = (callObj.customer ?? body.customer ?? {}) as Record<string, unknown>;

  const callId =
    asString(callObj.id) ??
    asString(body.callId) ??
    asString(body.id) ??
    "unknown";

  const sessionKey = scopedSessionKey(tenant.id, callId);

  const transcript =
    asString(message?.transcript) ??
    asString(message?.artifact?.transcript) ??
    asString(body.transcript);

  const summary =
    asString(message?.summary) ??
    asString((message?.analysis as Record<string, unknown> | undefined)?.summary) ??
    asString(body.summary);

  const recordingUrl =
    asString(message?.recordingUrl) ??
    asString(message?.artifact?.recordingUrl) ??
    asString(body.recordingUrl);

  const outcomes = extractOutcomes(body);
  const conversationState = getConversationState(sessionKey);
  if (conversationState !== "greeting") {
    outcomes.conversationState = conversationState;
  }

  return {
    event: "call.ended",
    source: effectiveSource,
    receivedAt: new Date().toISOString(),
    tenant: {
      slug: tenant.slug,
      id: tenant.id,
      displayName: tenant.displayName,
    },
    business: {
      name: tenant.displayName,
      phone: tenant.businessPhone,
      timezone: tenant.timezone,
    },
    call: {
      id: callId,
      status: asString(callObj.status) ?? asString(body.status),
      direction: asString(callObj.type) ?? asString(body.direction),
      endedReason: asString(message?.endedReason) ?? asString(body.endedReason),
      startedAt: asString(message?.startedAt) ?? asString(body.startedAt),
      endedAt: asString(message?.endedAt) ?? asString(body.endedAt),
      durationSeconds:
        typeof message?.durationSeconds === "number"
          ? message.durationSeconds
          : typeof body.durationSeconds === "number"
            ? body.durationSeconds
            : undefined,
    },
    customer: {
      phone: asString(customer.number) ?? asString(customer.phone) ?? asString(body.customerPhone),
      name: asString(customer.name) ?? asString(body.customerName),
      email: asString(customer.email) ?? asString(body.customerEmail),
    },
    content: {
      summary,
      transcript,
      recordingUrl,
      messages: messagesFromArtifact(message) ??
        (Array.isArray(body.messages)
          ? (body.messages as Array<{ role?: string; message?: string }>).map((m) => ({
              role: asString(m.role) ?? "unknown",
              message: asString(m.message) ?? "",
            }))
          : undefined),
    },
    analysis:
      message?.analysis && typeof message.analysis === "object"
        ? message.analysis
        : body.analysis && typeof body.analysis === "object"
          ? (body.analysis as Record<string, unknown>)
          : undefined,
    outcomes,
    cost: typeof message?.cost === "number" ? message.cost : undefined,
    raw: env.NODE_ENV === "development" ? body : undefined,
  };
}

export function isVapiEndOfCallReport(body: Record<string, unknown>): boolean {
  const message = body.message as { type?: string } | undefined;
  return message?.type === "end-of-call-report";
}

export function isVapiServerEvent(body: Record<string, unknown>): boolean {
  const message = body.message as { type?: string } | undefined;
  return typeof message?.type === "string";
}
