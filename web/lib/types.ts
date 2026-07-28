export interface TenantSummary {
  id: string;
  slug: string;
  displayName: string;
  status: "active" | "suspended" | "trial";
  businessPhone: string;
  timezone: string;
  website?: string;
  integrationsConfigured: {
    calcom: boolean;
    stripe: boolean;
    make: boolean;
    vapiWebhookSecret: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceUsd: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  serviceId: string;
  priority: "normal" | "urgent";
  suggestPayment: boolean;
}

export interface TenantDetail extends TenantSummary {
  hours: Record<string, string>;
  services: Service[];
  faqs: Array<{ question: string; answer: string }>;
  policies: string[];
  skills: Skill[];
  promptAppend?: string;
  integrations: {
    voiceEngine: string;
    calcomEventTypeId?: number;
    vapiAssistantId?: string;
    hasCalcomApiKey: boolean;
    hasStripeSecretKey: boolean;
    hasMakeWebhookUrl: boolean;
    hasVapiWebhookSecret: boolean;
  };
}

export interface Booking {
  id: string;
  tenantSlug: string;
  attendeeName: string;
  attendeePhone: string;
  startTime: string;
  serviceName?: string;
  skillName?: string;
  callerReason?: string;
  status: string;
  createdAt: string;
}

export interface Onboarding {
  tenant: TenantSummary;
  vapi: {
    serverUrl: string;
    systemPrompt: string;
    tools: unknown[];
  };
  checklist: Array<{ step: number; task: string; done: boolean }>;
}
