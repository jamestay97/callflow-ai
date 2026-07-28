import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { config, validateYouTubeConfig } from "./config.js";
import { ensureEnvFile } from "./envManager.js";
import { createDailyVideo } from "./pipeline.js";
import { initLogger, logInfo } from "./logger.js";
import { todaySlug, videoExistsToday } from "./state.js";
import { hasYouTubeToken } from "./youtubeUpload.js";
import { APP_VERSION, type HealthCheck } from "./launch.js";

export async function getHealthCheck(port: number): Promise<HealthCheck> {
  await ensureEnvFile();
  const youtubeConfigured = validateYouTubeConfig().length === 0;
  const youtubeConnected = youtubeConfigured && (await hasYouTubeToken());
  const hasSampleVideo = await videoExistsToday();

  let envFile = false;
  let outputDir = false;
  let credentialsDir = false;

  try {
    await access(path.join(config.root, ".env"));
    envFile = true;
  } catch { /* */ }

  try {
    await mkdir(config.outputDir, { recursive: true });
    outputDir = true;
  } catch { /* */ }

  try {
    await mkdir(config.credentialsDir, { recursive: true });
    credentialsDir = true;
  } catch { /* */ }

  const ok = envFile && outputDir && credentialsDir;

  return {
    ok,
    version: APP_VERSION,
    mode: youtubeConnected ? "production" : "test",
    checks: {
      envFile,
      outputDir,
      credentialsDir,
      hasSampleVideo,
      youtubeConfigured,
      youtubeConnected,
    },
    launchUrl: `http://localhost:${port}`,
    message: hasSampleVideo
      ? "Test build ready — sample video available for preview."
      : "App ready — create a sample video to begin testing.",
  };
}

export async function prepareTestLaunch(force = false): Promise<void> {
  await initLogger();
  await ensureEnvFile();
  await mkdir(config.outputDir, { recursive: true });
  await mkdir(config.logsDir, { recursive: true });

  const slug = todaySlug();
  await logInfo(`Preparing test launch (v${APP_VERSION}) for ${slug}...`);

  if (!force && (await videoExistsToday())) {
    console.log(`\nSample video already exists for ${slug}. Skipping creation.`);
    console.log(`Use --force to regenerate.\n`);
    return;
  }

  console.log("\nGenerating sample test video (1–2 min)...\n");
  const result = await createDailyVideo(force);
  console.log(`\nSample video ready: ${result.videoPath}\n`);
}

export async function runTestLaunch(): Promise<void> {
  await prepareTestLaunch(false);
  const { startDashboard } = await import("./dashboard.js");
  await startDashboard();
}
