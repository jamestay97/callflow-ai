import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config, reloadConfig } from "./config.js";

const ENV_PATH = path.join(config.root, ".env");

const ENV_KEYS = [
  "GEMINI_API_KEY",
  "YOUTUBE_CLIENT_ID",
  "YOUTUBE_CLIENT_SECRET",
  "YOUTUBE_PRIVACY",
  "CHANNEL_NAME",
  "DEFAULT_VOICE",
  "CRON_SCHEDULE",
  "TIMEZONE",
  "RUN_ON_START",
  "SKIP_IF_UPLOADED",
  "UPLOAD_RETRIES",
] as const;

export async function ensureEnvFile(): Promise<void> {
  try {
    await access(ENV_PATH);
  } catch {
    const example = path.join(config.root, ".env.example");
    const content = await readFile(example, "utf8");
    await writeFile(ENV_PATH, content, "utf8");
  }
}

export async function readEnvFile(): Promise<Record<string, string>> {
  await ensureEnvFile();
  const raw = await readFile(ENV_PATH, "utf8");
  const result: Record<string, string> = {};

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    result[key] = value;
  }

  return result;
}

export async function updateEnvFile(updates: Record<string, string>): Promise<void> {
  await ensureEnvFile();
  const current = await readEnvFile();
  const merged = { ...current, ...updates };

  const lines: string[] = [
    "# Kids YouTube Bot configuration",
    "# Generated/updated by the app dashboard",
    "",
  ];

  for (const key of ENV_KEYS) {
    if (merged[key] !== undefined) {
      lines.push(`${key}=${merged[key]}`);
    }
  }

  // Preserve any custom keys not in ENV_KEYS
  for (const [key, value] of Object.entries(merged)) {
    if (!(ENV_KEYS as readonly string[]).includes(key)) {
      lines.push(`${key}=${value}`);
    }
  }

  await writeFile(ENV_PATH, lines.join("\n") + "\n", "utf8");

  // Reload into process.env so changes apply without restart
  for (const [key, value] of Object.entries(updates)) {
    process.env[key] = value;
  }
  reloadConfig();
}

export function maskSecret(value: string | undefined): string {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••" + value.slice(-4);
}
