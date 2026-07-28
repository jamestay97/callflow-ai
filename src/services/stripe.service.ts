import Stripe from "stripe";
import { ConfigError, ExternalApiError } from "../utils/errors.js";
import type { TenantRecord } from "../types/tenant.js";

const stripeClients = new Map<string, Stripe>();

function getStripe(tenant: TenantRecord): Stripe {
  const key = tenant.integrations.stripeSecretKey;
  if (!key) {
    throw new ConfigError(
      "Stripe not configured for this business",
      "I'm unable to send a payment link right now. We can take your payment when the technician arrives, or someone can call you back with a link.",
    );
  }

  let client = stripeClients.get(tenant.id);
  if (!client) {
    client = new Stripe(key);
    stripeClients.set(tenant.id, client);
  }

  return client;
}

export interface SendPaymentLinkInput {
  serviceId: string;
  customerPhone: string;
  customerName?: string;
}

export interface PaymentLinkResult {
  paymentLinkUrl: string;
  serviceName: string;
  amountUsd: number;
}

export async function createPaymentLink(
  tenant: TenantRecord,
  input: SendPaymentLinkInput,
): Promise<PaymentLinkResult> {
  const service = tenant.services.find((s) => s.id === input.serviceId);

  if (!service) {
    const names = tenant.services.map((s) => s.name).join(", ");
    throw new ExternalApiError(
      `Unknown service id: ${input.serviceId}`,
      `I couldn't find that service. We offer: ${names}. Which one do you need?`,
    );
  }

  const stripe = getStripe(tenant);

  try {
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(service.priceUsd * 100),
            product_data: {
              name: `${tenant.displayName} — ${service.name}`,
              description: service.description,
            },
          },
          quantity: 1,
        },
      ] as unknown as Stripe.PaymentLinkCreateParams.LineItem[],
      metadata: {
        tenant_slug: tenant.slug,
        service_id: service.id,
        customer_phone: input.customerPhone,
        customer_name: input.customerName ?? "",
      },
      phone_number_collection: { enabled: false },
    });

    if (!paymentLink.url) {
      throw new ExternalApiError(
        "Stripe payment link missing url",
        "I'm having trouble generating the payment link right now. Would you like someone to text it to you shortly?",
      );
    }

    return {
      paymentLinkUrl: paymentLink.url,
      serviceName: service.name,
      amountUsd: service.priceUsd,
    };
  } catch (error) {
    if (error instanceof ExternalApiError || error instanceof ConfigError) {
      throw error;
    }

    throw new ExternalApiError(
      error instanceof Error ? error.message : "Stripe error",
      "I'm having trouble generating the payment link right now. Would you like someone to text it to you shortly?",
      error,
    );
  }
}
