import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";

export const APP_VERSION = "0.1.0-test";

export async function getVideoPathForDate(date: string): Promise<string | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const videoPath = path.join(config.outputDir, date, "video.mp4");
  try {
    await access(videoPath);
    return videoPath;
  } catch {
    return null;
  }
}

export function streamVideo(date: string, videoPath: string, res: import("node:http").ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "video/mp4",
    "Content-Disposition": `inline; filename="kids-video-${date}.mp4"`,
  });
  createReadStream(videoPath).pipe(res);
}

export interface HealthCheck {
  ok: boolean;
  version: string;
  mode: "test" | "production";
  checks: {
    envFile: boolean;
    outputDir: boolean;
    credentialsDir: boolean;
    hasSampleVideo: boolean;
    youtubeConfigured: boolean;
    youtubeConnected: boolean;
  };
  launchUrl: string;
  message: string;
}
