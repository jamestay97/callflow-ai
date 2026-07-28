import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";

const LOCK_PATH = path.join(config.outputDir, ".automation.lock");
const STALE_LOCK_MS = 2 * 60 * 60 * 1000; // 2 hours

interface LockData {
  pid: number;
  startedAt: string;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function acquireLock(): Promise<() => Promise<void>> {
  await mkdir(config.outputDir, { recursive: true });

  if (await fileExists(LOCK_PATH)) {
    try {
      const raw = await readFile(LOCK_PATH, "utf8");
      const lock = JSON.parse(raw) as LockData;
      const age = Date.now() - new Date(lock.startedAt).getTime();
      if (age < STALE_LOCK_MS) {
        throw new Error(
          `Another automation run is in progress (pid ${lock.pid}, started ${lock.startedAt}).`
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("in progress")) throw err;
    }
  }

  const lock: LockData = { pid: process.pid, startedAt: new Date().toISOString() };
  await writeFile(LOCK_PATH, JSON.stringify(lock, null, 2), "utf8");

  return async () => {
    try {
      await rm(LOCK_PATH, { force: true });
    } catch {
      // ignore
    }
  };
}

export interface DayMetadata {
  title: string;
  description: string;
  tags: string[];
  createdAt?: string;
  videoPath?: string;
  uploadedAt?: string;
  youtubeVideoId?: string;
  youtubeUrl?: string;
}

export function todaySlug(): string {
  return new Date().toISOString().slice(0, 10);
}

export function workDirForToday(): string {
  return path.join(config.outputDir, todaySlug());
}

export async function readDayMetadata(): Promise<DayMetadata | null> {
  const metaPath = path.join(workDirForToday(), "metadata.json");
  try {
    const raw = await readFile(metaPath, "utf8");
    return JSON.parse(raw) as DayMetadata;
  } catch {
    return null;
  }
}

export async function writeDayMetadata(metadata: DayMetadata): Promise<void> {
  const workDir = workDirForToday();
  await mkdir(workDir, { recursive: true });
  await writeFile(path.join(workDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf8");
}

export async function isUploadedToday(): Promise<boolean> {
  const meta = await readDayMetadata();
  return Boolean(meta?.youtubeVideoId && meta?.uploadedAt);
}

export async function videoExistsToday(): Promise<boolean> {
  return fileExists(path.join(workDirForToday(), "video.mp4"));
}
