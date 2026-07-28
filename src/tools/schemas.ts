/**
 * Tool function definitions for Vapi assistant configuration.
 * With unified Server URL (/webhook/voice), tools do NOT need individual server URLs.
 */
export const voiceToolDefinitions = [
  {
    type: "function",
    function: {
      name: "match_call_intent",
      description:
        "Match the caller's reason for calling to the best service/skill. Call this early when the caller explains their problem or need.",
      parameters: {
        type: "object",
        properties: {
          caller_reason: {
            type: "string",
            description: "The caller's reason for calling in their own words.",
          },
        },
        required: ["caller_reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_calendar_availability",
      description:
        "Check open appointment slots for a date range. Call when the caller wants to schedule and provides a date or range.",
      parameters: {
        type: "object",
        properties: {
          start_date: {
            type: "string",
            description: "Start date in YYYY-MM-DD format (inclusive).",
          },
          end_date: {
            type: "string",
            description: "End date in YYYY-MM-DD format (inclusive). Defaults to start_date if omitted.",
          },
          time_zone: {
            type: "string",
            description: "IANA timezone, e.g. America/New_York. Defaults to business timezone.",
          },
        },
        required: ["start_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description:
        "Book an appointment after the caller selects a slot. Requires name, phone, and exact start time from availability results.",
      parameters: {
        type: "object",
        properties: {
          start_time: {
            type: "string",
            description: "ISO 8601 start time of the selected slot (from check_calendar_availability).",
          },
          attendee_name: {
            type: "string",
            description: "Caller's full name.",
          },
          attendee_phone: {
            type: "string",
            description: "Caller's phone number in E.164 format, e.g. +15551234567.",
          },
          attendee_email: {
            type: "string",
            description: "Optional email for calendar confirmation.",
          },
          notes: {
            type: "string",
            description: "Optional reason for visit or special instructions.",
          },
          time_zone: {
            type: "string",
            description: "IANA timezone used when presenting slots to the caller.",
          },
        },
        required: ["start_time", "attendee_name", "attendee_phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_payment_link",
      description:
        "Generate a secure Stripe payment link for a service. NEVER collect card numbers — only send the link via SMS. Use service_id from the business knowledge base.",
      parameters: {
        type: "object",
        properties: {
          service_id: {
            type: "string",
            description: "Service ID from match_call_intent or business services list.",
          },
          customer_phone: {
            type: "string",
            description: "Mobile number to receive the payment link via SMS (E.164 format).",
          },
          customer_name: {
            type: "string",
            description: "Optional customer name for payment metadata.",
          },
        },
        required: ["service_id", "customer_phone"],
      },
    },
  },
] as const;

export type VoiceToolName =
  | "match_call_intent"
  | "check_calendar_availability"
  | "book_appointment"
  | "send_payment_link";

export function getToolDefinitions(baseUrl: string, tenantSlug?: string) {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const webhookBase = tenantSlug ? `${cleanBase}/webhook/${tenantSlug}` : cleanBase;
  return {
    tools: voiceToolDefinitions,
    serverUrl: `${webhookBase}/voice`,
    directEndpoints: {
      check_calendar_availability: tenantSlug
        ? `${cleanBase}/api/${tenantSlug}/tools/check_calendar_availability`
        : `${cleanBase}/api/tools/check_calendar_availability`,
      book_appointment: tenantSlug
        ? `${cleanBase}/api/${tenantSlug}/tools/book_appointment`
        : `${cleanBase}/api/tools/book_appointment`,
      send_payment_link: tenantSlug
        ? `${cleanBase}/api/${tenantSlug}/tools/send_payment_link`
        : `${cleanBase}/api/tools/send_payment_link`,
    },
  };
}
