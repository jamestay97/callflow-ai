import type { BusinessKnowledge } from "../knowledge/businessKnowledge.js";
import type { ReceptionistSkill } from "./skills.js";

export type TenantStatus = "active" | "suspended" | "trial";

export interface TenantIntegrations {
  calcomApiKey?: string;
  calcomEventTypeId?: number;
  stripeSecretKey?: string;
  makeWebhookUrl?: string;
  vapiWebhookSecret?: string;
  vapiAssistantId?: string;
  voiceEngine: "vapi" | "callsphere";
}

export interface TenantRecord {
  id: string;
  slug: string;
  displayName: string;
  status: TenantStatus;
  businessPhone: string;
  timezone: string;
  website?: string;
  hours: Record<string, string>;
  services: BusinessKnowledge["services"];
  faqs: BusinessKnowledge["faqs"];
  policies: string[];
  skills: ReceptionistSkill[];
  promptAppend?: string;
  integrations: TenantIntegrations;
  createdAt: string;
  updatedAt: string;
}

/** Tenant with secrets stripped — safe for list responses. */
export interface TenantPublicSummary {
  id: string;
  slug: string;
  displayName: string;
  status: TenantStatus;
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

export interface CreateTenantInput {
  slug: string;
  displayName: string;
  businessPhone: string;
  timezone?: string;
  website?: string;
  hours?: Record<string, string>;
  services?: BusinessKnowledge["services"];
  faqs?: BusinessKnowledge["faqs"];
  policies?: string[];
  skills?: ReceptionistSkill[];
  promptAppend?: string;
  status?: TenantStatus;
  integrations?: Partial<TenantIntegrations>;
}

export type UpdateTenantInput = Partial<Omit<CreateTenantInput, "slug">>;

export function tenantToKnowledge(tenant: TenantRecord): BusinessKnowledge {
  return {
    name: tenant.displayName,
    phone: tenant.businessPhone,
    timezone: tenant.timezone,
    website: tenant.website,
    hours: tenant.hours,
    services: tenant.services,
    faqs: tenant.faqs,
    policies: tenant.policies,
  };
}

export function toPublicSummary(tenant: TenantRecord): TenantPublicSummary {
  return {
    id: tenant.id,
    slug: tenant.slug,
    displayName: tenant.displayName,
    status: tenant.status,
    businessPhone: tenant.businessPhone,
    timezone: tenant.timezone,
    website: tenant.website,
    integrationsConfigured: {
      calcom: Boolean(
        tenant.integrations.calcomApiKey && tenant.integrations.calcomEventTypeId,
      ),
      stripe: Boolean(tenant.integrations.stripeSecretKey),
      make: Boolean(tenant.integrations.makeWebhookUrl),
      vapiWebhookSecret: Boolean(tenant.integrations.vapiWebhookSecret),
    },
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
  };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
