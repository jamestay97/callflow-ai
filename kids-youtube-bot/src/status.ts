import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { config, validateYouTubeConfig } from "./config.js";
import { readDayMetadata, todaySlug, videoExistsToday } from "./state.js";
import { hasYouTubeToken, verifyYouTubeConnection } from "./youtubeUpload.js";
import { readEnvFile, maskSecret } from "./envManager.js";
import { APP_VERSION } from "./launch.js";

export interface VideoSummary {
  date: string;
  title: string;
  uploaded: boolean;
  youtubeUrl?: string;
  videoPath: string;
  previewUrl: string;
}

export interface AppStatus {
  version: string;
  mode: "test" | "production";
  ready: boolean;
  channelName: string;
  privacy: string;
  schedule: string;
  timezone: string;
  hasCredentials: boolean;
  hasToken: boolean;
  connectedChannel?: { title: string; id: string };
  connectionError?: string;
  today: {
    date: string;
    hasVideo: boolean;
    uploaded: boolean;
    title?: string;
    youtubeUrl?: string;
  };
  recentVideos: VideoSummary[];
  credentials: {
    clientIdSet: boolean;
    clientIdPreview: string;
    clientSecretSet: boolean;
  };
}

async function readMetadataForDate(date: string): Promise<{
  title?: string;
  youtubeUrl?: string;
  uploaded: boolean;
} | null> {
  try {
    const raw = await import("node:fs/promises").then((fs) =>
      fs.readFile(path.join(config.outputDir, date, "metadata.json"), "utf8")
    );
    const meta = JSON.parse(raw) as { title?: string; youtubeUrl?: string; youtubeVideoId?: string };
    return {
      title: meta.title,
      youtubeUrl: meta.youtubeUrl,
      uploaded: Boolean(meta.youtubeVideoId),
    };
  } catch {
    return null;
  }
}

export async function listRecentVideos(limit = 10): Promise<VideoSummary[]> {
  try {
    const entries = await readdir(config.outputDir, { withFileTypes: true });
    const dates = entries
      .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
      .map((e) => e.name)
      .sort()
      .reverse()
      .slice(0, limit);

    const videos: VideoSummary[] = [];
    for (const date of dates) {
      const videoPath = path.join(config.outputDir, date, "video.mp4");
      try {
        await stat(videoPath);
      } catch {
        continue;
      }
      const meta = await readMetadataForDate(date);
      videos.push({
        date,
        title: meta?.title ?? `Video ${date}`,
        uploaded: meta?.uploaded ?? false,
        youtubeUrl: meta?.youtubeUrl,
        videoPath,
        previewUrl: `/api/video/${date}`,
      });
    }
    return videos;
  } catch {
    return [];
  }
}

export async function getAppStatus(): Promise<AppStatus> {
  const env = await readEnvFile();
  const configErrors = validateYouTubeConfig();
  const hasCredentials = configErrors.length === 0;
  const hasToken = await hasYouTubeToken();

  let connectedChannel: { title: string; id: string } | undefined;
  let connectionError: string | undefined;

  if (hasCredentials && hasToken) {
    try {
      const ch = await verifyYouTubeConnection();
      connectedChannel = { title: ch.channelTitle, id: ch.channelId };
    } catch (err) {
      connectionError = err instanceof Error ? err.message : String(err);
    }
  }

  const todayMeta = await readDayMetadata();
  const recentVideos = await listRecentVideos(7);

  return {
    version: APP_VERSION,
    mode: hasCredentials && Boolean(connectedChannel) ? "production" : "test",
    ready: hasCredentials && hasToken && Boolean(connectedChannel),
    channelName: config.channelName,
    privacy: config.privacyStatus,
    schedule: config.cronSchedule,
    timezone: config.timezone,
    hasCredentials,
    hasToken,
    connectedChannel,
    connectionError,
    today: {
      date: todaySlug(),
      hasVideo: await videoExistsToday(),
      uploaded: Boolean(todayMeta?.youtubeVideoId),
      title: todayMeta?.title,
      youtubeUrl: todayMeta?.youtubeUrl,
    },
    recentVideos,
    credentials: {
      clientIdSet: Boolean(env.YOUTUBE_CLIENT_ID),
      clientIdPreview: maskSecret(env.YOUTUBE_CLIENT_ID),
      clientSecretSet: Boolean(env.YOUTUBE_CLIENT_SECRET),
    },
  };
}
