import { z } from "zod";
import type { Request, Response } from "express";
import {
  addTenant,
  getAllTenantSummaries,
  getTenantBySlugAdmin,
  getTenantForAdmin,
  getTenantOnboarding,
  getTenantPrompt,
  patchTenant,
  removeTenant,
} from "../tenants/tenant.service.js";
import { getToolDefinitions } from "../tools/schemas.js";
import { getPublicBaseUrl } from "../utils/logger.js";
import { bookingStats, listBookings } from "../db/bookingStore.js";
import { slugify } from "../types/tenant.js";
import { paramString } from "../utils/params.js";

const serviceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  priceUsd: z.number().positive(),
});

const createTenantSchema = z.object({
  slug: z.string().min(2).optional(),
  displayName: z.string().min(2),
  businessPhone: z.string().min(10),
  timezone: z.string().optional(),
  website: z.string().url().optional(),
  hours: z.record(z.string()).optional(),
  services: z.array(serviceSchema).optional(),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  policies: z.array(z.string()).optional(),
  promptAppend: z.string().optional(),
  skills: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    keywords: z.array(z.string()),
    serviceId: z.string(),
    priority: z.enum(["normal", "urgent"]),
    suggestPayment: z.boolean(),
  })).optional(),
  status: z.enum(["active", "suspended", "trial"]).optional(),
  integrations: z
    .object({
      voiceEngine: z.enum(["vapi", "callsphere"]).optional(),
      calcomApiKey: z.string().optional(),
      calcomEventTypeId: z.coerce.number().optional(),
      stripeSecretKey: z.string().optional(),
      makeWebhookUrl: z.string().url().optional(),
      vapiWebhookSecret: z.string().optional(),
      vapiAssistantId: z.string().optional(),
    })
    .optional(),
});

const updateTenantSchema = createTenantSchema.partial().omit({ slug: true });

export function listTenantsHandler(_req: Request, res: Response): void {
  const tenants = getAllTenantSummaries();
  res.json({ tenants, count: tenants.length });
}

export function createTenantHandler(req: Request, res: Response): void {
  const parsed = createTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid tenant payload", details: parsed.error.flatten() });
    return;
  }

  const slug = parsed.data.slug ?? slugify(parsed.data.displayName);

  try {
    const tenant = addTenant({ ...parsed.data, slug });
    res.status(201).json({ tenant: getTenantForAdmin(tenant.slug) });
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "Create failed" });
  }
}

export function getTenantHandler(req: Request, res: Response): void {
  try {
    res.json({ tenant: getTenantForAdmin(paramString(req.params.tenantSlug)) });
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Not found" });
  }
}

export function updateTenantHandler(req: Request, res: Response): void {
  const parsed = updateTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid update payload", details: parsed.error.flatten() });
    return;
  }

  try {
    patchTenant(paramString(req.params.tenantSlug), parsed.data);
    res.json({ tenant: getTenantForAdmin(paramString(req.params.tenantSlug)) });
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Update failed" });
  }
}

export function deleteTenantHandler(req: Request, res: Response): void {
  try {
    removeTenant(paramString(req.params.tenantSlug));
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Delete failed" });
  }
}

export function tenantPromptHandler(req: Request, res: Response): void {
  try {
    const tenant = getTenantBySlugAdmin(paramString(req.params.tenantSlug));
    res.json({
      slug: tenant.slug,
      displayName: tenant.displayName,
      systemPrompt: getTenantPrompt(tenant),
    });
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Not found" });
  }
}

export function tenantSchemasHandler(req: Request, res: Response): void {
  try {
    const tenant = getTenantBySlugAdmin(paramString(req.params.tenantSlug));
    res.json({
      tenant: tenant.slug,
      ...getToolDefinitions(getPublicBaseUrl(), tenant.slug),
    });
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Not found" });
  }
}

export function tenantOnboardingHandler(req: Request, res: Response): void {
  try {
    const tenant = getTenantBySlugAdmin(paramString(req.params.tenantSlug));
    res.json(getTenantOnboarding(tenant));
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Not found" });
  }
}

export function tenantBookingsHandler(req: Request, res: Response): void {
  try {
    const slug = paramString(req.params.tenantSlug);
    getTenantBySlugAdmin(slug);
    res.json({
      stats: bookingStats(slug),
      bookings: listBookings(slug),
    });
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Not found" });
  }
}
