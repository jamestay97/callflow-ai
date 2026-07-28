import type { TenantRecord } from "../types/tenant.js";
import { getPublicBaseUrl } from "../utils/logger.js";
import { buildSystemPrompt } from "../prompts/systemPrompt.js";
import { getToolDefinitions } from "../tools/schemas.js";
import { tenantToKnowledge, toPublicSummary } from "../types/tenant.js";
import {
  createTenant,
  deleteTenant,
  getTenantBySlug,
  listTenants,
  updateTenant,
} from "../db/tenantStore.js";
import type { CreateTenantInput, UpdateTenantInput } from "../types/tenant.js";

export function getAllTenantSummaries() {
  return listTenants().map(toPublicSummary);
}

export function getTenantOrThrow(slug: string): TenantRecord {
  const tenant = getTenantBySlug(slug);
  if (!tenant) {
    throw new Error(`Tenant not found: ${slug}`);
  }
  if (tenant.status === "suspended") {
    throw new Error(`Tenant is suspended: ${slug}`);
  }
  return tenant;
}

export function getActiveTenant(slug: string): TenantRecord {
  return getTenantOrThrow(slug);
}

export function addTenant(input: CreateTenantInput): TenantRecord {
  return createTenant(input);
}

export function patchTenant(slug: string, input: UpdateTenantInput): TenantRecord {
  return updateTenant(slug, input);
}

export function removeTenant(slug: string): void {
  deleteTenant(slug);
}

export function getTenantPrompt(tenant: TenantRecord): string {
  const base = buildSystemPrompt({
    knowledge: tenantToKnowledge(tenant),
    skills: tenant.skills,
  });
  if (!tenant.promptAppend?.trim()) {
    return base;
  }
  return `${base}\n\n## Additional business instructions\n${tenant.promptAppend.trim()}`;
}

export function getTenantOnboarding(tenant: TenantRecord) {
  const baseUrl = getPublicBaseUrl();
  return {
    tenant: toPublicSummary(tenant),
    vapi: {
      serverUrl: `${baseUrl}/webhook/${tenant.slug}/voice`,
      webhookSecretEnvKey: "Set per-tenant vapiWebhookSecret in admin API",
      tools: getToolDefinitions(baseUrl, tenant.slug).tools,
      systemPrompt: getTenantPrompt(tenant),
    },
    makeCom: {
      webhookEvents: ["call.ended", "payment.link.created"],
      note: "Filter Make.com scenarios on the event field in the JSON body.",
    },
    checklist: [
      { step: 1, task: "Add Cal.com API key + event type ID", done: Boolean(tenant.integrations.calcomApiKey) },
      { step: 2, task: "Add Stripe secret key", done: Boolean(tenant.integrations.stripeSecretKey) },
      { step: 3, task: "Add Make.com webhook URL", done: Boolean(tenant.integrations.makeWebhookUrl) },
      { step: 4, task: "Set Vapi Server URL to tenant serverUrl", done: false },
      { step: 5, task: "Paste systemPrompt into Vapi assistant", done: false },
      { step: 6, task: "Add the 3 tools to Vapi assistant", done: false },
    ],
  };
}

export function getTenantBySlugAdmin(slug: string): TenantRecord {
  const tenant = getTenantBySlug(slug);
  if (!tenant) {
    throw new Error(`Tenant not found: ${slug}`);
  }
  return tenant;
}

export function getTenantForAdmin(slug: string) {
  const tenant = getTenantBySlugAdmin(slug);
  return {
    ...toPublicSummary(tenant),
    hours: tenant.hours,
    services: tenant.services,
    faqs: tenant.faqs,
    policies: tenant.policies,
    skills: tenant.skills,
    promptAppend: tenant.promptAppend,
    integrations: {
      voiceEngine: tenant.integrations.voiceEngine,
      calcomEventTypeId: tenant.integrations.calcomEventTypeId,
      vapiAssistantId: tenant.integrations.vapiAssistantId,
      hasCalcomApiKey: Boolean(tenant.integrations.calcomApiKey),
      hasStripeSecretKey: Boolean(tenant.integrations.stripeSecretKey),
      hasMakeWebhookUrl: Boolean(tenant.integrations.makeWebhookUrl),
      hasVapiWebhookSecret: Boolean(tenant.integrations.vapiWebhookSecret),
    },
  };
}
