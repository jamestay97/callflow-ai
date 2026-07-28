import { env } from "../config/env.js";
import { ConfigError, ExternalApiError } from "../utils/errors.js";
import type { TenantRecord } from "../types/tenant.js";

const CAL_API_VERSION = "2024-08-13";

export interface AvailabilitySlot {
  start: string;
  end: string;
  label: string;
}

export interface CheckAvailabilityInput {
  startDate: string;
  endDate: string;
  timeZone?: string;
}

export interface BookAppointmentInput {
  startTime: string;
  attendeeName: string;
  attendeePhone: string;
  attendeeEmail?: string;
  timeZone?: string;
  notes?: string;
}

export interface BookingResult {
  bookingUid: string;
  start: string;
  end?: string;
  status: string;
}

interface CalcomSlotsResponse {
  data?: Record<string, string[] | Array<{ start: string; end: string }>>;
  status?: string;
  error?: { message?: string };
}

interface CalcomBookingResponse {
  data?: {
    uid?: string;
    start?: string;
    end?: string;
    status?: string;
  };
  status?: string;
  error?: { message?: string };
}

function requireCalcomConfig(tenant: TenantRecord): { apiKey: string; eventTypeId: number } {
  const apiKey = tenant.integrations.calcomApiKey;
  const eventTypeId = tenant.integrations.calcomEventTypeId;

  if (!apiKey) {
    throw new ConfigError(
      "Cal.com API key not configured for this business",
      "I'm having trouble accessing the calendar right now. Would you like me to take your details and have someone call you back?",
    );
  }
  if (!eventTypeId) {
    throw new ConfigError(
      "Cal.com event type not configured for this business",
      "I'm having trouble accessing the calendar right now. Would you like me to take your details and have someone call you back?",
    );
  }
  return { apiKey, eventTypeId };
}

async function calcomFetch<T>(
  tenant: TenantRecord,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { apiKey } = requireCalcomConfig(tenant);
  const url = `${env.CALCOM_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "cal-api-version": CAL_API_VERSION,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = (await response.json()) as T & { error?: { message?: string } };

  if (!response.ok) {
    const detail = body?.error?.message ?? response.statusText;
    throw new ExternalApiError(
      `Cal.com API error (${response.status}): ${detail}`,
      "I'm having trouble accessing the calendar right now. Would you like to try a different day, or should I have someone call you back?",
      body,
    );
  }

  return body;
}

function formatSlotLabel(isoStart: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(isoStart));
}

function parseSlotsPayload(
  data: CalcomSlotsResponse["data"],
  timeZone: string,
): AvailabilitySlot[] {
  if (!data) {
    return [];
  }

  const slots: AvailabilitySlot[] = [];

  for (const value of Object.values(data)) {
    if (!Array.isArray(value)) {
      continue;
    }

    for (const entry of value) {
      if (typeof entry === "string") {
        slots.push({
          start: entry,
          end: entry,
          label: formatSlotLabel(entry, timeZone),
        });
      } else if (entry && typeof entry === "object" && "start" in entry) {
        slots.push({
          start: entry.start,
          end: entry.end,
          label: formatSlotLabel(entry.start, timeZone),
        });
      }
    }
  }

  return slots.sort((a, b) => a.start.localeCompare(b.start));
}

export async function checkCalendarAvailability(
  tenant: TenantRecord,
  input: CheckAvailabilityInput,
): Promise<{ slots: AvailabilitySlot[]; timeZone: string }> {
  const { eventTypeId } = requireCalcomConfig(tenant);
  const timeZone = input.timeZone ?? tenant.timezone;

  const params = new URLSearchParams({
    eventTypeId: String(eventTypeId),
    start: input.startDate,
    end: input.endDate,
    timeZone,
    format: "range",
  });

  const result = await calcomFetch<CalcomSlotsResponse>(tenant, `/slots?${params.toString()}`);
  const slots = parseSlotsPayload(result.data, timeZone);

  return { slots, timeZone };
}

export async function bookAppointment(
  tenant: TenantRecord,
  input: BookAppointmentInput,
): Promise<BookingResult> {
  const { eventTypeId } = requireCalcomConfig(tenant);
  const timeZone = input.timeZone ?? tenant.timezone;

  const email =
    input.attendeeEmail ??
    `${input.attendeePhone.replace(/\D/g, "") || "caller"}@phone.local`;

  const payload = {
    eventTypeId,
    start: input.startTime,
    attendee: {
      name: input.attendeeName,
      email,
      phoneNumber: input.attendeePhone,
      timeZone,
      language: "en",
    },
    metadata: input.notes ? { notes: input.notes, tenant: tenant.slug } : { tenant: tenant.slug },
  };

  const result = await calcomFetch<CalcomBookingResponse>(tenant, "/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const booking = result.data;
  if (!booking?.uid) {
    throw new ExternalApiError(
      "Cal.com booking response missing uid",
      "That time slot may have just been taken. Would you like me to check for another available time?",
      result,
    );
  }

  return {
    bookingUid: booking.uid,
    start: booking.start ?? input.startTime,
    end: booking.end,
    status: booking.status ?? "accepted",
  };
}
