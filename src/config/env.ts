import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

function emptyToUndefined(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/^["']|["']$/g, "");
    if (trimmed === "") {
      return undefined;
    }
    return trimmed;
  }
  return value;
}

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalNumber = z.preprocess(emptyToUndefined, z.coerce.number().optional());

function normalizePublicUrl(input: string): string {
  let url = input.trim().replace(/^["']|["']$/g, "").replace(/\/$/, "");
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

function isValidPublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/** Railway injects domain/URL once you generate a networking domain. */
function resolvePublicBaseUrl(value: unknown): unknown {
  const candidates: string[] = [];

  if (typeof value === "string" && value.trim() !== "") {
    const raw = value.trim().replace(/^["']|["']$/g, "");
    // Skip unexpanded Railway template syntax like ${{RAILWAY_PUBLIC_DOMAIN}}
    if (!raw.includes("${{")) {
      candidates.push(normalizePublicUrl(raw));
    }
  }

  const railwayStatic = process.env.RAILWAY_STATIC_URL?.trim();
  if (railwayStatic) {
    candidates.push(normalizePublicUrl(railwayStatic));
  }

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayDomain) {
    candidates.push(normalizePublicUrl(railwayDomain));
  }

  for (const candidate of candidates) {
    if (isValidPublicUrl(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

const envSchema = z
  .object({
    PORT: z.coerce.number().default(3001),
    WEB_APP_URL: z.string().url().default("http://localhost:3000"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    PUBLIC_BASE_URL: z.preprocess(
      resolvePublicBaseUrl,
      z
        .string()
        .optional()
        .refine((v) => v === undefined || isValidPublicUrl(v), { message: "Invalid url" }),
    ),
    TRUST_PROXY: z.preprocess(emptyToUndefined, z.coerce.boolean().optional()).default(false),
    CORS_ORIGINS: optionalString,
    ADMIN_API_KEY: optionalString,

    VOICE_ENGINE: z.enum(["callsphere", "vapi"]).default("vapi"),
    CALLSPHERE_API_KEY: optionalString,
    CALLSPHERE_WEBHOOK_SECRET: optionalString,
    VAPI_API_KEY: optionalString,
    VAPI_WEBHOOK_SECRET: optionalString,

    CALCOM_API_KEY: optionalString,
    CALCOM_EVENT_TYPE_ID: optionalNumber,
    CALCOM_BASE_URL: z.string().url().default("https://api.cal.com/v2"),

    STRIPE_SECRET_KEY: optionalString,
    STRIPE_WEBHOOK_SECRET: optionalString,

    MAKE_WEBHOOK_URL: optionalUrl,

    TENANT_DATA_PATH: z.string().default("./data/tenants.json"),
    BOOKINGS_DATA_PATH: z.string().default("./data/bookings.json"),

    BUSINESS_NAME: z.string().default("Local Business"),
    BUSINESS_PHONE: z.string().default(""),
    BUSINESS_TIMEZONE: z.string().default("America/New_York"),
    BUSINESS_WEBSITE: optionalUrl,
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== "production") {
      return;
    }

    const required: Array<[keyof typeof data, string]> = [
      ["PUBLIC_BASE_URL", "PUBLIC_BASE_URL is required in production (your HTTPS API domain)"],
      ["ADMIN_API_KEY", "ADMIN_API_KEY is required in production to protect admin routes"],
    ];

    for (const [key, message] of required) {
      if (data[key] === undefined || data[key] === "") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [key] });
      }
    }

    if (data.VOICE_ENGINE === "vapi" && !data.VAPI_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "VAPI_WEBHOOK_SECRET is required in production",
        path: ["VAPI_WEBHOOK_SECRET"],
      });
    }

    if (data.VOICE_ENGINE === "callsphere" && !data.CALLSPHERE_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CALLSPHERE_WEBHOOK_SECRET is required in production",
        path: ["CALLSPHERE_WEBHOOK_SECRET"],
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Environment validation failed. Check your .env file.");
  }

  return parsed.data;
}

export const env = loadEnv();

export function isProduction(): boolean {
  return env.NODE_ENV === "production";
}

export function getCorsOrigins(): string[] | true {
  if (!env.CORS_ORIGINS) {
    return isProduction() ? [] : true;
  }
  return env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
}
