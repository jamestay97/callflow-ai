export type ConversationState =
  | "greeting"
  | "answering_questions"
  | "intent_matching"
  | "booking"
  | "payment"
  | "closing";

const VALID_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  greeting: ["answering_questions", "intent_matching", "booking", "payment", "closing"],
  answering_questions: ["intent_matching", "booking", "payment", "closing", "answering_questions"],
  intent_matching: ["booking", "payment", "answering_questions", "closing"],
  booking: ["payment", "closing", "answering_questions", "booking"],
  payment: ["closing", "booking", "answering_questions"],
  closing: ["closing"],
};

const TOOL_STATE_HINTS: Record<string, ConversationState> = {
  match_call_intent: "intent_matching",
  check_calendar_availability: "booking",
  book_appointment: "booking",
  send_payment_link: "payment",
};

/** In-memory session store — replace with Redis/DB for production. */
const sessions = new Map<string, ConversationState>();

export function getConversationState(callId: string): ConversationState {
  return sessions.get(callId) ?? "greeting";
}

export function setConversationState(callId: string, state: ConversationState): void {
  sessions.set(callId, state);
}

export function transitionState(
  callId: string,
  next: ConversationState,
): ConversationState {
  const current = getConversationState(callId);
  const allowed = VALID_TRANSITIONS[current];

  if (!allowed.includes(next)) {
    console.warn(`[state] Invalid transition ${current} → ${next} for call ${callId}`);
    return current;
  }

  sessions.set(callId, next);
  return next;
}

export function transitionForTool(callId: string, toolName: string): ConversationState {
  const target = TOOL_STATE_HINTS[toolName];
  if (!target) {
    return getConversationState(callId);
  }
  return transitionState(callId, target);
}

export function resolveCallId(req: { body?: Record<string, unknown>; headers?: Record<string, unknown> }): string {
  const body = req.body ?? {};
  const message = body.message as { call?: { id?: string } } | undefined;
  const call = body.call as { id?: string } | undefined;

  const candidates: unknown[] = [
    body.callId,
    call?.id,
    message?.call?.id,
    req.headers?.["x-call-id"],
  ];

  for (const id of candidates) {
    if (typeof id === "string" && id.length > 0) {
      return id;
    }
  }

  return "anonymous";
}

export function scopedSessionKey(tenantId: string, callId: string): string {
  return `${tenantId}:${callId}`;
}

export function resolveSessionKey(
  tenantId: string,
  req: { body?: Record<string, unknown>; headers?: Record<string, unknown> },
): string {
  return scopedSessionKey(tenantId, resolveCallId(req));
}

export function clearConversationState(sessionKey: string): void {
  sessions.delete(sessionKey);
}
