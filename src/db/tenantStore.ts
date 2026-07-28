import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { defaultBusinessKnowledge } from "../knowledge/businessKnowledge.js";
import { defaultSkills } from "../types/skills.js";
import type {
  CreateTenantInput,
  TenantRecord,
  UpdateTenantInput,
} from "../types/tenant.js";
import { slugify } from "../types/tenant.js";

interface TenantStoreFile {
  version: 1;
  tenants: TenantRecord[];
}

const DEFAULT_STORE: TenantStoreFile = { version: 1, tenants: [] };

function storePath(): string {
  return env.TENANT_DATA_PATH;
}

function ensureDataDir(): void {
  const dir = dirname(storePath());
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readStore(): TenantStoreFile {
  ensureDataDir();
  if (!existsSync(storePath())) {
    return { ...DEFAULT_STORE, tenants: [] };
  }

  const raw = readFileSync(storePath(), "utf-8");
  const parsed = JSON.parse(raw) as TenantStoreFile;
  if (!parsed.tenants || !Array.isArray(parsed.tenants)) {
    return { version: 1, tenants: [] };
  }
  return parsed;
}

function writeStore(store: TenantStoreFile): void {
  ensureDataDir();
  const tmp = `${storePath()}.tmp`;
  writeFileSync(tmp, JSON.stringify(store, null, 2), "utf-8");
  renameSync(tmp, storePath());
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeSlug(slug: string): string {
  const normalized = slugify(slug);
  if (!normalized) {
    throw new Error("Invalid slug — use letters, numbers, and hyphens only.");
  }
  return normalized;
}

export function listTenants(): TenantRecord[] {
  return readStore().tenants.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function getTenantBySlug(slug: string): TenantRecord | undefined {
  const normalized = normalizeSlug(slug);
  const tenant = readStore().tenants.find((t) => t.slug === normalized);
  if (tenant && !tenant.skills) {
    tenant.skills = defaultSkills;
  }
  return tenant;
}

export function getTenantById(id: string): TenantRecord | undefined {
  return readStore().tenants.find((t) => t.id === id);
}

export function createTenant(input: CreateTenantInput): TenantRecord {
  const store = readStore();
  const slug = normalizeSlug(input.slug);

  if (store.tenants.some((t) => t.slug === slug)) {
    throw new Error(`Tenant slug already exists: ${slug}`);
  }

  const timestamp = nowIso();
  const tenant: TenantRecord = {
    id: randomUUID(),
    slug,
    displayName: input.displayName,
    status: input.status ?? "trial",
    businessPhone: input.businessPhone,
    timezone: input.timezone ?? "America/New_York",
    website: input.website,
    hours: input.hours ?? defaultBusinessKnowledge.hours,
    services: input.services ?? defaultBusinessKnowledge.services,
    faqs: input.faqs ?? defaultBusinessKnowledge.faqs,
    policies: input.policies ?? defaultBusinessKnowledge.policies,
    skills: input.skills ?? defaultSkills,
    promptAppend: input.promptAppend,
    integrations: {
      voiceEngine: input.integrations?.voiceEngine ?? "vapi",
      calcomApiKey: input.integrations?.calcomApiKey,
      calcomEventTypeId: input.integrations?.calcomEventTypeId,
      stripeSecretKey: input.integrations?.stripeSecretKey,
      makeWebhookUrl: input.integrations?.makeWebhookUrl,
      vapiWebhookSecret: input.integrations?.vapiWebhookSecret,
      vapiAssistantId: input.integrations?.vapiAssistantId,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.tenants.push(tenant);
  writeStore(store);
  return tenant;
}

export function updateTenant(slug: string, input: UpdateTenantInput): TenantRecord {
  const store = readStore();
  const normalized = normalizeSlug(slug);
  const index = store.tenants.findIndex((t) => t.slug === normalized);

  if (index === -1) {
    throw new Error(`Tenant not found: ${slug}`);
  }

  const existing = store.tenants[index];
  const updated: TenantRecord = {
    ...existing,
    displayName: input.displayName ?? existing.displayName,
    status: input.status ?? existing.status,
    businessPhone: input.businessPhone ?? existing.businessPhone,
    timezone: input.timezone ?? existing.timezone,
    website: input.website ?? existing.website,
    hours: input.hours ?? existing.hours,
    services: input.services ?? existing.services,
    faqs: input.faqs ?? existing.faqs,
    policies: input.policies ?? existing.policies,
    skills: input.skills ?? existing.skills ?? defaultSkills,
    promptAppend: input.promptAppend ?? existing.promptAppend,
    integrations: {
      ...existing.integrations,
      ...input.integrations,
    },
    updatedAt: nowIso(),
  };

  store.tenants[index] = updated;
  writeStore(store);
  return updated;
}

export function deleteTenant(slug: string): void {
  const store = readStore();
  const normalized = normalizeSlug(slug);
  const next = store.tenants.filter((t) => t.slug !== normalized);

  if (next.length === store.tenants.length) {
    throw new Error(`Tenant not found: ${slug}`);
  }

  writeStore({ version: 1, tenants: next });
}

export function tenantCount(): number {
  return readStore().tenants.length;
}

/** Seed a demo tenant from legacy .env business vars when store is empty. */
export function seedDemoTenantIfEmpty(): TenantRecord | null {
  if (tenantCount() > 0) {
    return null;
  }

  return createTenant({
    slug: "demo",
    displayName: env.BUSINESS_NAME,
    businessPhone: env.BUSINESS_PHONE || "+15551234567",
    timezone: env.BUSINESS_TIMEZONE,
    website: env.BUSINESS_WEBSITE,
    status: "active",
    integrations: {
      voiceEngine: env.VOICE_ENGINE,
      calcomApiKey: env.CALCOM_API_KEY,
      calcomEventTypeId: env.CALCOM_EVENT_TYPE_ID,
      stripeSecretKey: env.STRIPE_SECRET_KEY,
      makeWebhookUrl: env.MAKE_WEBHOOK_URL,
      vapiWebhookSecret: env.VAPI_WEBHOOK_SECRET,
    },
  });
}

export function initTenantStore(): void {
  ensureDataDir();
  seedDemoTenantIfEmpty();
}
