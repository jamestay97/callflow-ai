import { mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { generateScript } from "./scriptGenerator.js";
import { generateSceneAudio } from "./tts.js";
import { renderSceneClips, writeVideoConcatList } from "./visuals.js";
import { buildVideo } from "./videoBuilder.js";
import { describeSceneMusic } from "./music.js";
import {
  isUploadedToday,
  readDayMetadata,
  todaySlug,
  videoExistsToday,
  workDirForToday,
  writeDayMetadata,
  type DayMetadata,
} from "./state.js";
import { uploadWithRetry } from "./youtubeUpload.js";
import { logInfo, logWarn } from "./logger.js";

export interface PipelineResult {
  workDir: string;
  videoPath: string;
  title: string;
}

export async function createDailyVideo(force = false): Promise<PipelineResult> {
  const workDir = workDirForToday();
  const videoPath = path.join(workDir, "video.mp4");

  if (!force && (await videoExistsToday())) {
    const meta = await readDayMetadata();
    await logInfo(`Video already exists for ${todaySlug()} — skipping creation.`);
    return {
      workDir,
      videoPath,
      title: meta?.title ?? "Today's video",
    };
  }

  await mkdir(workDir, { recursive: true });

  await logInfo("Generating script...");
  const script = await generateScript(config.geminiApiKey);

  await logInfo(`Title: ${script.title}`);
  await logInfo(`Scenes: ${script.scenes.length}, Music: ${describeSceneMusic(script.scenes)}`);

  await logInfo("Generating narration...");
  const sceneAudio = await generateSceneAudio(
    script.scenes,
    path.join(workDir, "audio"),
    config.voice
  );

  const durations = sceneAudio.map((s) => s.durationSeconds);

  await logInfo("Rendering 2D preschool cartoon scenes...");
  const clipPaths = await renderSceneClips(
    script.scenes,
    durations,
    path.join(workDir, "clips"),
    sceneAudio
  );

  const videoConcatListPath = path.join(workDir, "video-concat.txt");
  await writeVideoConcatList(clipPaths, videoConcatListPath);

  await logInfo("Building video with music...");
  await buildVideo(
    videoConcatListPath,
    sceneAudio,
    script.scenes,
    path.join(workDir, "build"),
    videoPath
  );

  const metadata: DayMetadata = {
    title: script.title,
    description: script.description,
    tags: script.tags,
    createdAt: new Date().toISOString(),
    videoPath,
  };
  await writeDayMetadata(metadata);

  await logInfo(`Video ready: ${videoPath}`);
  return { workDir, videoPath, title: script.title };
}

export async function uploadTodayVideo(force = false): Promise<string | null> {
  if (!force && (await isUploadedToday())) {
    const meta = await readDayMetadata();
    await logInfo(`Already uploaded today: ${meta?.youtubeUrl}`);
    return meta?.youtubeUrl ?? null;
  }

  const workDir = workDirForToday();
  const videoPath = path.join(workDir, "video.mp4");
  const meta = await readDayMetadata();

  if (!meta) {
    await logWarn(`No video metadata for ${todaySlug()}. Creating video first...`);
    await createDailyVideo();
    return uploadTodayVideo(force);
  }

  if (!(await videoExistsToday())) {
    throw new Error(`Video file missing: ${videoPath}`);
  }

  await logInfo(`Uploading to YouTube: ${meta.title}`);
  const videoId = await uploadWithRetry({
    videoPath,
    title: meta.title,
    description: meta.description,
    tags: meta.tags,
  });

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  await writeDayMetadata({
    ...meta,
    uploadedAt: new Date().toISOString(),
    youtubeVideoId: videoId,
    youtubeUrl: url,
  });

  await logInfo(`Uploaded successfully: ${url}`);
  return url;
}

export async function uploadVideoByDate(date: string, force = false): Promise<string | null> {
  const workDir = path.join(config.outputDir, date);
  const videoPath = path.join(workDir, "video.mp4");
  const fullMeta = await readMetadataForDate(date);

  if (!fullMeta) {
    throw new Error(`No video found for ${date}. Create one first.`);
  }

  if (!force && fullMeta.youtubeVideoId) {
    return fullMeta.youtubeUrl ?? null;
  }

  const { access } = await import("node:fs/promises");
  await access(videoPath);

  await logInfo(`Uploading ${date}: ${fullMeta.title}`);
  const videoId = await uploadWithRetry({
    videoPath,
    title: fullMeta.title,
    description: fullMeta.description,
    tags: fullMeta.tags,
  });

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  await writeDayMetadata({
    ...fullMeta,
    uploadedAt: new Date().toISOString(),
    youtubeVideoId: videoId,
    youtubeUrl: url,
  });

  await logInfo(`Uploaded: ${url}`);
  return url;
}

async function readMetadataForDate(date: string): Promise<DayMetadata | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(path.join(config.outputDir, date, "metadata.json"), "utf8");
    return JSON.parse(raw) as DayMetadata;
  } catch {
    return null;
  }
}

export async function createAndUpload(options?: { force?: boolean }): Promise<string | null> {
  const force = options?.force ?? false;
  await createDailyVideo(force);
  return uploadTodayVideo(force);
}
