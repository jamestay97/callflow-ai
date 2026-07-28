import { tenantCount } from "../db/tenantStore.js";
import { env } from "./env.js";

export interface IntegrationStatus {
  configured: boolean;
  required: boolean;
}

export interface ReadinessReport {
  status: "ready" | "degraded" | "not_ready";
  service: string;
  mode: "multi-tenant";
  environment: string;
  tenantCount: number;
  platform: {
    adminApiKey: IntegrationStatus;
    publicBaseUrl: IntegrationStatus;
  };
  timestamp: string;
}

export function getReadinessReport(): ReadinessReport {
  const adminConfigured = Boolean(env.ADMIN_API_KEY);
  const publicUrlConfigured = Boolean(env.PUBLIC_BASE_URL);
  const count = tenantCount();

  const platform = {
    adminApiKey: { configured: adminConfigured, required: env.NODE_ENV === "production" },
    publicBaseUrl: { configured: publicUrlConfigured, required: env.NODE_ENV === "production" },
  };

  const missingRequired = Object.values(platform).some((i) => i.required && !i.configured);

  let status: ReadinessReport["status"] = "ready";
  if (missingRequired || count === 0) {
    status = "not_ready";
  } else if (!adminConfigured || !publicUrlConfigured) {
    status = "degraded";
  }

  return {
    status,
    service: "ai-receptionist",
    mode: "multi-tenant",
    environment: env.NODE_ENV,
    tenantCount: count,
    platform,
    timestamp: new Date().toISOString(),
  };
}
