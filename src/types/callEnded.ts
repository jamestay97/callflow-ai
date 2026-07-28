/**
 * Normalized call-ended payload forwarded to Make.com for SMS/email workflows.
 */
export interface CallEndedPayload {
  event: "call.ended";
  source: "vapi" | "callsphere" | "direct";
  receivedAt: string;
  tenant?: {
    slug: string;
    id: string;
    displayName: string;
  };
  business: {
    name: string;
    phone: string;
    timezone: string;
  };
  call: {
    id: string;
    status?: string;
    direction?: string;
    endedReason?: string;
    startedAt?: string;
    endedAt?: string;
    durationSeconds?: number;
  };
  customer: {
    phone?: string;
    name?: string;
    email?: string;
  };
  content: {
    summary?: string;
    transcript?: string;
    recordingUrl?: string;
    messages?: Array<{ role: string; message: string }>;
  };
  analysis?: Record<string, unknown>;
  outcomes: {
    conversationState?: string;
    booking?: {
      bookingUid?: string;
      start?: string;
      attendeeName?: string;
      attendeePhone?: string;
    };
    payment?: {
      paymentLinkUrl?: string;
      serviceName?: string;
      amountUsd?: number;
      customerPhone?: string;
    };
  };
  cost?: number;
  raw?: Record<string, unknown>;
}

export interface VapiWebhookBody {
  message?: {
    type?: string;
    endedReason?: string;
    summary?: string;
    transcript?: string;
    recordingUrl?: string;
    startedAt?: string;
    endedAt?: string;
    durationSeconds?: number;
    cost?: number;
    analysis?: Record<string, unknown>;
    artifact?: {
      transcript?: string;
      recordingUrl?: string;
      messages?: Array<{ role?: string; message?: string; content?: string }>;
    };
    call?: {
      id?: string;
      status?: string;
      type?: string;
      customer?: { number?: string; name?: string; email?: string };
    };
    messages?: Array<{ role?: string; message?: string }>;
  };
  call?: Record<string, unknown>;
}
