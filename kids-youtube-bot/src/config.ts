import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function env(key: string, fallback?: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || fallback;
}

function buildConfig() {
  return {
    root: ROOT,
    channelName: env("CHANNEL_NAME", "Learning Adventures for Kids")!,
    voice: env("DEFAULT_VOICE", "en-US-AnaNeural")!,
    outputDir: path.join(ROOT, "output"),
    credentialsDir: path.join(ROOT, "credentials"),
    logsDir: path.join(ROOT, "logs"),
    cronSchedule: env("CRON_SCHEDULE", "0 9 * * *")!,
    timezone: env("TIMEZONE", "America/New_York")!,
    geminiApiKey: env("GEMINI_API_KEY"),
    youtubeClientId: env("YOUTUBE_CLIENT_ID"),
    youtubeClientSecret: env("YOUTUBE_CLIENT_SECRET"),
    privacyStatus: (env("YOUTUBE_PRIVACY", "public") as "public" | "unlisted" | "private"),
    runOnStart: env("RUN_ON_START", "true") !== "false",
    uploadRetries: Number(env("UPLOAD_RETRIES", "3")),
    skipIfUploaded: env("SKIP_IF_UPLOADED", "true") !== "false",
    dashboardPort: Number(env("DASHBOARD_PORT", "3847")),
    /** Pollinations API key for free-tier AI video (optional). Get at https://enter.pollinations.ai */
    pollinationsApiKey: env("POLLINATIONS_API_KEY"),
    /** visual engine: show (full cartoon) | talking | ai | threed | auto */
    visualEngine: (env("VISUAL_ENGINE", "show") as "show" | "talking" | "ai" | "threed" | "auto"),
  };
}

export const config = buildConfig();

export function reloadConfig(): void {
  const next = buildConfig();
  Object.assign(config, next);
}

export function validateYouTubeConfig(): string[] {
  const errors: string[] = [];
  if (!config.youtubeClientId) errors.push("YOUTUBE_CLIENT_ID is missing in .env");
  if (!config.youtubeClientSecret) errors.push("YOUTUBE_CLIENT_SECRET is missing in .env");
  return errors;
}
