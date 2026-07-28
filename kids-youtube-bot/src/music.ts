import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import type { Scene } from "./types.js";
import { resolveSceneMusic, type MusicTrack } from "./types.js";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export const MUSIC_DIR = path.join(ROOT, "assets", "music");

const TRACK_FILES: Record<Exclude<MusicTrack, "none">, string> = {
  upbeat: "upbeat.mp3",
  calm: "calm.mp3",
  celebrate: "celebrate.mp3",
};

const MUSIC_VOLUME: Record<MusicTrack, number> = {
  upbeat: 0.16,
  calm: 0.07,
  celebrate: 0.14,
  none: 0,
};

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function runFfmpeg(command: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    command.on("end", () => resolve()).on("error", reject);
  });
}

async function generateTrack(outPath: string, freqA: number, freqB: number): Promise<void> {
  if (await fileExists(outPath)) return;

  await runFfmpeg(
    ffmpeg()
      .input(`sine=frequency=${freqA}:duration=16`)
      .inputOptions(["-f lavfi"])
      .input(`sine=frequency=${freqB}:duration=16`)
      .inputOptions(["-f lavfi"])
      .complexFilter(["[0:a]volume=0.12[a0]", "[1:a]volume=0.1[a1]", "[a0][a1]amix=inputs=2:duration=longest:dropout_transition=2[out]"])
      .outputOptions(["-map [out]", "-c:a libmp3lame", "-b:a 128k"])
      .save(outPath)
  );
}

/** Creates placeholder loops, or use your own MP3s in assets/music/. */
export async function ensureDefaultMusic(): Promise<void> {
  await mkdir(MUSIC_DIR, { recursive: true });
  await generateTrack(path.join(MUSIC_DIR, TRACK_FILES.upbeat), 261.63, 392.0);
  await generateTrack(path.join(MUSIC_DIR, TRACK_FILES.calm), 196.0, 246.94);
  await generateTrack(path.join(MUSIC_DIR, TRACK_FILES.celebrate), 329.63, 493.88);
}

export async function getTrackPath(track: MusicTrack): Promise<string | null> {
  if (track === "none") return null;
  await ensureDefaultMusic();
  return path.join(MUSIC_DIR, TRACK_FILES[track]);
}

function silentSegment(duration: number, outPath: string): Promise<void> {
  return runFfmpeg(
    ffmpeg()
      .input("anullsrc=r=44100:cl=stereo")
      .inputOptions(["-f lavfi"])
      .outputOptions(["-t", String(duration), "-c:a libmp3lame"])
      .save(outPath)
  );
}

function loopAudioToDuration(input: string, duration: number, volume: number, outPath: string): Promise<void> {
  return runFfmpeg(
    ffmpeg()
      .input(input)
      .inputOptions(["-stream_loop", "-1"])
      .outputOptions(["-t", String(duration), "-af", `volume=${volume}`, "-c:a libmp3lame"])
      .save(outPath)
  );
}

function concatAudioFiles(files: string[], outPath: string): Promise<void> {
  if (files.length === 1) {
    return runFfmpeg(ffmpeg(files[0]!).outputOptions(["-c copy"]).save(outPath));
  }

  const listPath = outPath.replace(/\.mp3$/, "-list.txt");
  const content = files.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n");
  return writeFile(listPath, content, "utf8").then(() =>
    runFfmpeg(
      ffmpeg()
        .input(listPath)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy"])
        .save(outPath)
    )
  );
}

function mixNarrationAndMusic(narrationPath: string, musicPath: string, outPath: string): Promise<void> {
  return runFfmpeg(
    ffmpeg()
      .input(narrationPath)
      .input(musicPath)
      .complexFilter(["[1:a]volume=1[m]", "[0:a][m]amix=inputs=2:duration=first:dropout_transition=2[out]"])
      .outputOptions(["-map [out]", "-c:a libmp3lame", "-b:a 192k"])
      .save(outPath)
  );
}

export async function buildMixedAudio(
  narrationPath: string,
  scenes: Scene[],
  sceneDurations: number[],
  workDir: string
): Promise<string> {
  await mkdir(workDir, { recursive: true });
  const musicSegments: string[] = [];
  let hasMusic = false;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]!;
    const duration = sceneDurations[i] ?? 5;
    const track = resolveSceneMusic(scene);
    const volume = MUSIC_VOLUME[track];
    const segPath = path.join(workDir, `music-seg-${String(i).padStart(2, "0")}.mp3`);

    if (track === "none" || volume <= 0) {
      await silentSegment(duration, segPath);
      musicSegments.push(segPath);
      continue;
    }

    const trackPath = await getTrackPath(track);
    if (!trackPath) {
      await silentSegment(duration, segPath);
      musicSegments.push(segPath);
      continue;
    }

    hasMusic = true;
    await loopAudioToDuration(trackPath, duration, volume, segPath);
    musicSegments.push(segPath);
  }

  if (!hasMusic) return narrationPath;

  const musicBedPath = path.join(workDir, "music-bed.mp3");
  await concatAudioFiles(musicSegments, musicBedPath);

  const mixedPath = path.join(workDir, "mixed-audio.mp3");
  await mixNarrationAndMusic(narrationPath, musicBedPath, mixedPath);
  return mixedPath;
}

export function describeSceneMusic(scenes: Scene[]): string {
  const used = scenes.map((s) => resolveSceneMusic(s)).filter((t) => t !== "none");
  const unique = [...new Set(used)];
  return unique.length ? unique.join(", ") : "none";
}
