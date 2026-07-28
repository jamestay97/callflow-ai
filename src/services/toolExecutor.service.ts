import { z } from "zod";
import type { TenantRecord } from "../types/tenant.js";
import { createBooking } from "../db/bookingStore.js";
import { matchCallIntent } from "../services/intent.service.js";
import {
  bookAppointment,
  checkCalendarAvailability,
} from "../services/calcom.service.js";
import { forwardPaymentLinkToMake } from "../services/make.service.js";
import { createPaymentLink } from "../services/stripe.service.js";
import {
  getConversationState,
  transitionForTool,
  transitionState,
} from "../state/conversationState.js";
import { toolFailure, toolSuccess, type ToolResult } from "../types/toolResponse.js";
import { toSpeakableError } from "../utils/errors.js";
import type { VoiceToolName } from "../tools/schemas.js";

const checkAvailabilitySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time_zone: z.string().optional(),
});

const matchIntentSchema = z.object({
  caller_reason: z.string().min(3),
});

const bookAppointmentSchema = z.object({
  start_time: z.string().min(10),
  attendee_name: z.string().min(1),
  attendee_phone: z.string().min(10),
  attendee_email: z.string().email().optional(),
  notes: z.string().optional(),
  time_zone: z.string().optional(),
  service_id: z.string().optional(),
  skill_id: z.string().optional(),
  caller_reason: z.string().optional(),
});

const sendPaymentLinkSchema = z.object({
  service_id: z.string().min(1),
  customer_phone: z.string().min(10),
  customer_name: z.string().optional(),
});

export async function executeTool(
  tenant: TenantRecord,
  sessionKey: string,
  toolName: VoiceToolName,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  transitionForTool(sessionKey, toolName);

  switch (toolName) {
    case "match_call_intent":
      return executeMatchIntent(tenant, sessionKey, args);
    case "check_calendar_availability":
      return executeCheckAvailability(tenant, sessionKey, args);
    case "book_appointment":
      return executeBookAppointment(tenant, sessionKey, args);
    case "send_payment_link":
      return executeSendPaymentLink(tenant, sessionKey, args);
    default:
      return toolFailure("That action isn't available right now.");
  }
}

async function executeMatchIntent(
  tenant: TenantRecord,
  sessionKey: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const parsed = matchIntentSchema.safeParse(args);
  if (!parsed.success) {
    return toolFailure(
      "Could you tell me a bit more about what you need help with today?",
      getConversationState(sessionKey),
    );
  }

  const result = matchCallIntent(tenant, parsed.data.caller_reason);
  transitionState(sessionKey, "intent_matching");

  return toolSuccess(result.message, {
    matched: result.matched,
    skillId: result.skill?.id,
    skillName: result.skill?.name,
    serviceId: result.serviceId,
    serviceName: result.serviceName,
    priority: result.priority,
    suggestPayment: result.suggestPayment,
    confidence: result.confidence,
  }, getConversationState(sessionKey));
}

async function executeCheckAvailability(
  tenant: TenantRecord,
  sessionKey: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const parsed = checkAvailabilitySchema.safeParse(args);
  if (!parsed.success) {
    return toolFailure(
      "I need a date to check availability. What day works best for you?",
      getConversationState(sessionKey),
    );
  }

  try {
    const { start_date, end_date, time_zone } = parsed.data;
    const { slots, timeZone } = await checkCalendarAvailability(tenant, {
      startDate: start_date,
      endDate: end_date ?? start_date,
      timeZone: time_zone ?? tenant.timezone,
    });

    if (slots.length === 0) {
      return toolFailure(
        `I don't see any open slots between ${start_date} and ${end_date ?? start_date}. Would you like to try another day?`,
        getConversationState(sessionKey),
      );
    }

    const topSlots = slots.slice(0, 5);
    const spoken = topSlots.map((s) => s.label).join(", ");

    return toolSuccess(
      `I found open times in ${timeZone}: ${spoken}. Which time works best for you?`,
      { slots: topSlots, timeZone },
      getConversationState(sessionKey),
    );
  } catch (error) {
    return toolFailure(
      toSpeakableError(
        error,
        "I'm having trouble accessing the calendar right now. Would you like me to have someone call you back?",
      ),
      getConversationState(sessionKey),
    );
  }
}

async function executeBookAppointment(
  tenant: TenantRecord,
  sessionKey: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const parsed = bookAppointmentSchema.safeParse(args);
  if (!parsed.success) {
    return toolFailure(
      "Before I book that, I'll need your full name, phone number, and which time slot you'd like.",
      getConversationState(sessionKey),
    );
  }

  try {
    const booking = await bookAppointment(tenant, {
      startTime: parsed.data.start_time,
      attendeeName: parsed.data.attendee_name,
      attendeePhone: parsed.data.attendee_phone,
      attendeeEmail: parsed.data.attendee_email,
      notes: parsed.data.notes,
      timeZone: parsed.data.time_zone,
    });

    const state = transitionState(sessionKey, "closing");
    const service = tenant.services.find((s) => s.id === parsed.data.service_id);
    const skill = tenant.skills?.find((s) => s.id === parsed.data.skill_id);

    createBooking({
      tenantSlug: tenant.slug,
      tenantId: tenant.id,
      calcomUid: booking.bookingUid,
      attendeeName: parsed.data.attendee_name,
      attendeePhone: parsed.data.attendee_phone,
      attendeeEmail: parsed.data.attendee_email,
      startTime: booking.start,
      endTime: booking.end,
      serviceId: parsed.data.service_id ?? service?.id,
      serviceName: service?.name,
      skillId: parsed.data.skill_id ?? skill?.id,
      skillName: skill?.name,
      callerReason: parsed.data.caller_reason,
      notes: parsed.data.notes,
    });

    return toolSuccess(
      `You're all set! I've booked your appointment for ${parsed.data.attendee_name}. You'll receive a confirmation shortly. Is there anything else I can help with?`,
      booking,
      state,
    );
  } catch (error) {
    return toolFailure(
      toSpeakableError(
        error,
        "I wasn't able to complete that booking. Would you like to try a different time?",
      ),
      getConversationState(sessionKey),
    );
  }
}

async function executeSendPaymentLink(
  tenant: TenantRecord,
  sessionKey: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const parsed = sendPaymentLinkSchema.safeParse(args);
  if (!parsed.success) {
    return toolFailure(
      "To send a payment link, I'll need to know which service you're paying for and the mobile number to text it to.",
      getConversationState(sessionKey),
    );
  }

  try {
    const payment = await createPaymentLink(tenant, {
      serviceId: parsed.data.service_id,
      customerPhone: parsed.data.customer_phone,
      customerName: parsed.data.customer_name,
    });

    await forwardPaymentLinkToMake(tenant, {
      callId: sessionKey,
      customerPhone: parsed.data.customer_phone,
      customerName: parsed.data.customer_name,
      payment,
    }).catch(() => {
      /* Non-blocking */
    });

    const state = transitionState(sessionKey, "closing");

    return toolSuccess(
      `I've just sent a secure payment link to your phone for ${payment.serviceName}, $${payment.amountUsd}. Please complete payment at your convenience — we never collect card numbers over the phone.`,
      payment,
      state,
    );
  } catch (error) {
    return toolFailure(
      toSpeakableError(
        error,
        "I'm having trouble sending the payment link right now. Would you like someone to text it to you shortly?",
      ),
      getConversationState(sessionKey),
    );
  }
}

export function parseToolArguments(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    return JSON.parse(raw) as Record<string, unknown>;
  }
  if (raw && typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return {};
}

export function isVoiceToolName(name: string): name is VoiceToolName {
  return (
    name === "match_call_intent" ||
    name === "check_calendar_availability" ||
    name === "book_appointment" ||
    name === "send_payment_link"
  );
}
