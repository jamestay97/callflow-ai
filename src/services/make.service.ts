import { env } from "../config/env.js";
import { ConfigError, ExternalApiError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import type { CallEndedPayload } from "../types/callEnded.js";
import type { TenantRecord } from "../types/tenant.js";
import type { PaymentLinkResult } from "./stripe.service.js";

export interface MakeForwardResult {
  forwarded: boolean;
  statusCode?: number;
  skipped?: boolean;
  reason?: string;
}

function resolveWebhookUrl(tenant: TenantRecord): string | undefined {
  return tenant.integrations.makeWebhookUrl ?? env.MAKE_WEBHOOK_URL;
}

async function postToMake(
  webhookUrl: string | undefined,
  payload: Record<string, unknown> | CallEndedPayload,
  headers: Record<string, string>,
): Promise<MakeForwardResult> {
  if (!webhookUrl) {
    logger.warn("Make.com webhook not configured for tenant — skipping forward");
    return {
      forwarded: false,
      skipped: true,
      reason: "Make.com webhook not configured",
    };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "ai-receptionist/0.1.0",
      ...headers,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ExternalApiError(
      `Make.com webhook failed (${response.status}): ${text}`,
      "Automation could not be triggered.",
      { status: response.status, body: text },
    );
  }

  return {
    forwarded: true,
    statusCode: response.status,
  };
}

export async function forwardToMake(
  tenant: TenantRecord,
  payload: CallEndedPayload,
): Promise<MakeForwardResult> {
  try {
    const result = await postToMake(resolveWebhookUrl(tenant), payload, {
      "X-Event-Type": payload.event,
      "X-Call-Id": payload.call.id,
      "X-Tenant-Slug": tenant.slug,
    });
    if (result.forwarded) {
      logger.info("Make.com call.ended forwarded", { callId: payload.call.id, tenant: tenant.slug });
    }
    return result;
  } catch (error) {
    if (error instanceof ExternalApiError) {
      logger.error(error.message);
      throw error;
    }
    throw new ExternalApiError(
      error instanceof Error ? error.message : "Make.com request failed",
      "Post-call automation could not be triggered.",
      error,
    );
  }
}

export interface PaymentLinkMakePayload {
  callId: string;
  customerPhone: string;
  customerName?: string;
  payment: PaymentLinkResult;
}

export async function forwardPaymentLinkToMake(
  tenant: TenantRecord,
  input: PaymentLinkMakePayload,
): Promise<MakeForwardResult> {
  try {
    return await postToMake(
      resolveWebhookUrl(tenant),
      {
        event: "payment.link.created",
        receivedAt: new Date().toISOString(),
        tenant: { slug: tenant.slug, id: tenant.id, displayName: tenant.displayName },
        business: {
          name: tenant.displayName,
          phone: tenant.businessPhone,
          timezone: tenant.timezone,
        },
        call: { id: input.callId },
        customer: {
          phone: input.customerPhone,
          name: input.customerName,
        },
        outcomes: {
          payment: {
            paymentLinkUrl: input.payment.paymentLinkUrl,
            serviceName: input.payment.serviceName,
            amountUsd: input.payment.amountUsd,
            customerPhone: input.customerPhone,
          },
        },
      },
      {
        "X-Event-Type": "payment.link.created",
        "X-Call-Id": input.callId,
        "X-Tenant-Slug": tenant.slug,
      },
    );
  } catch (error) {
    logger.error("Make.com payment link forward failed", {
      callId: input.callId,
      tenant: tenant.slug,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function requireMakeWebhookUrl(tenant: TenantRecord): string {
  const url = resolveWebhookUrl(tenant);
  if (!url) {
    throw new ConfigError(
      "Make.com webhook not configured",
      "Post-call webhook is not configured.",
    );
  }
  return url;
}
