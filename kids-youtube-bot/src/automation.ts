import cron from "node-cron";
import { config, validateYouTubeConfig } from "./config.js";
import { createAndUpload } from "./pipeline.js";
import { acquireLock, isUploadedToday, readDayMetadata } from "./state.js";
import {
  authenticateYouTube,
  hasYouTubeToken,
  verifyYouTubeConnection,
} from "./youtubeUpload.js";
import { initLogger, logError, logInfo, logWarn } from "./logger.js";

export interface AutomationResult {
  status: "skipped" | "success" | "failed";
  message: string;
  youtubeUrl?: string;
}

export async function runDailyJob(options?: { force?: boolean }): Promise<AutomationResult> {
  await initLogger();
  const release = await acquireLock();

  try {
    const configErrors = validateYouTubeConfig();
    if (configErrors.length > 0) {
      throw new Error(configErrors.join(" "));
    }

    if (!(await hasYouTubeToken())) {
      throw new Error("YouTube not authorized. Run: npm run auth");
    }

    const force = options?.force ?? false;

    if (!force && config.skipIfUploaded && (await isUploadedToday())) {
      const meta = await readDayMetadata();
      const msg = `Today's video already uploaded: ${meta?.youtubeUrl ?? "unknown"}`;
      await logInfo(msg);
      return { status: "skipped", message: msg, youtubeUrl: meta?.youtubeUrl };
    }

    await logInfo("=== Starting daily automation ===");
    const url = await createAndUpload({ force });
    const msg = url ? `Video live at ${url}` : "Pipeline finished without upload URL";
    await logInfo(`=== Daily automation complete: ${msg} ===`);
    return { status: "success", message: msg, youtubeUrl: url ?? undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(`Daily automation failed: ${msg}`);
    return { status: "failed", message: msg };
  } finally {
    await release();
  }
}

export async function printStatus(): Promise<void> {
  await initLogger();

  console.log("\n=== Kids YouTube Bot Status ===\n");
  console.log(`Channel name (config): ${config.channelName}`);
  console.log(`Schedule (cron):       ${config.cronSchedule} (${config.timezone})`);
  console.log(`Privacy:               ${config.privacyStatus}`);
  console.log(`Run on start:          ${config.runOnStart}`);

  const configErrors = validateYouTubeConfig();
  if (configErrors.length) {
    console.log("\nYouTube config:        NOT READY");
    configErrors.forEach((e) => console.log(`  - ${e}`));
  } else {
    console.log("\nYouTube config:        OK");
  }

  if (await hasYouTubeToken()) {
    try {
      const { channelTitle, channelId } = await verifyYouTubeConnection();
      console.log(`Connected channel:     ${channelTitle} (${channelId})`);
    } catch (err) {
      console.log(`Token status:          INVALID (${err instanceof Error ? err.message : err})`);
      console.log("  Run: npm run auth");
    }
  } else {
    console.log("Connected channel:     NOT AUTHORIZED");
    console.log("  Run: npm run auth");
  }

  const meta = await readDayMetadata();
  if (meta?.youtubeUrl) {
    console.log(`\nToday's upload:        ${meta.youtubeUrl}`);
  } else if (meta?.title) {
    console.log(`\nToday's video:         Created but not uploaded (${meta.title})`);
  } else {
    console.log("\nToday's video:         Not created yet");
  }

  console.log(`\nLogs:                  ${config.logsDir}/automation.log\n`);
}

export async function runSetupCheck(): Promise<boolean> {
  await initLogger();
  let ok = true;

  console.log("\n=== Setup Check ===\n");

  const configErrors = validateYouTubeConfig();
  if (configErrors.length) {
    ok = false;
    console.log("Missing YouTube credentials in .env:");
    configErrors.forEach((e) => console.log(`  - ${e}`));
    console.log("\nGet credentials: https://console.cloud.google.com/");
    console.log("  1. Create project → Enable YouTube Data API v3");
    console.log("  2. OAuth consent screen → External → add scope youtube.upload");
    console.log("  3. Credentials → OAuth 2.0 Client ID → Desktop app");
    console.log("  4. Add redirect URI: http://localhost:3000/oauth2callback\n");
  } else {
    console.log("YouTube credentials:   OK");
  }

  if (!(await hasYouTubeToken())) {
    ok = false;
    console.log("YouTube authorization: MISSING → run: npm run auth");
  } else {
    try {
      const { channelTitle } = await verifyYouTubeConnection();
      console.log(`YouTube authorization: OK (${channelTitle})`);
    } catch {
      ok = false;
      console.log("YouTube authorization: INVALID → run: npm run auth");
    }
  }

  if (ok) {
    console.log("\nSetup complete! Start full automation with: npm start\n");
  } else {
    console.log("\nFix the items above, then run: npm run setup\n");
  }

  return ok;
}

export function startScheduler(): void {
  if (!cron.validate(config.cronSchedule)) {
    throw new Error(`Invalid CRON_SCHEDULE: ${config.cronSchedule}`);
  }

  cron.schedule(
    config.cronSchedule,
    () => {
      void runDailyJob().catch((err) => logError(String(err)));
    },
    { timezone: config.timezone }
  );

  void logInfo(`Scheduler active — cron: ${config.cronSchedule} (${config.timezone})`);
}

export async function startAutomation(): Promise<void> {
  await initLogger();

  const ready = await runSetupCheck();
  if (!ready) {
    process.exit(1);
  }

  if (config.runOnStart) {
    await logInfo("RUN_ON_START enabled — running today's job now...");
    const result = await runDailyJob();
    if (result.status === "failed") {
      await logWarn("Initial run failed — scheduler will still retry on next cron tick.");
    }
  }

  startScheduler();
  await logInfo("Automation running. Leave this terminal open, or use scripts/install-task.ps1 for Windows Task Scheduler.");
  console.log("\nPress Ctrl+C to stop.\n");
}

export { authenticateYouTube };
