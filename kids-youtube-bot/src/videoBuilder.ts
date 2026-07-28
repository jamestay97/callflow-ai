import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import type { Scene } from "./types.js";
import type { SceneAudio } from "./tts.js";
import { buildMixedAudio } from "./music.js";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

function runFfmpeg(command: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    command.on("end", () => resolve()).on("error", reject);
  });
}

function concatAudio(audioFiles: string[], outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (audioFiles.length === 1) {
      ffmpeg(audioFiles[0]!)
        .outputOptions(["-c copy"])
        .save(outPath)
        .on("end", () => resolve())
        .on("error", reject);
      return;
    }

    const listPath = outPath.replace(/\.mp3$/, "-list.txt");
    const listContent = audioFiles.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n");

    writeFile(listPath, listContent, "utf8")
      .then(() => {
        ffmpeg()
          .input(listPath)
          .inputOptions(["-f concat", "-safe 0"])
          .outputOptions(["-c copy"])
          .save(outPath)
          .on("end", () => resolve())
          .on("error", reject);
      })
      .catch(reject);
  });
}

function mergeVideoAudio(
  silentVideoPath: string,
  audioPath: string,
  outPath: string
): Promise<void> {
  return runFfmpeg(
    ffmpeg()
      .input(silentVideoPath)
      .input(audioPath)
      .outputOptions([
        "-c:v copy",
        "-c:a aac",
        "-shortest",
        "-movflags +faststart",
      ])
      .save(outPath)
  );
}

function concatVideoClips(concatListPath: string, outPath: string): Promise<void> {
  return runFfmpeg(
    ffmpeg()
      .input(concatListPath)
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions([
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-r 30",
        "-movflags +faststart",
      ])
      .save(outPath)
  );
}

export async function buildVideo(
  videoConcatListPath: string,
  sceneAudio: SceneAudio[],
  scenes: Scene[],
  workDir: string,
  outputPath: string
): Promise<string> {
  await mkdir(workDir, { recursive: true });
  await mkdir(path.dirname(outputPath), { recursive: true });

  const silentVideo = path.join(workDir, "silent.mp4");
  const narrationPath = path.join(workDir, "narration.mp3");
  const durations = sceneAudio.map((s) => s.durationSeconds);

  await concatVideoClips(videoConcatListPath, silentVideo);
  await concatAudio(
    sceneAudio.map((s) => s.audioPath),
    narrationPath
  );

  const mixedAudio = await buildMixedAudio(narrationPath, scenes, durations, workDir);

  await mergeVideoAudio(silentVideo, mixedAudio, outputPath);
  return outputPath;
}

export async function writeMetadata(
  workDir: string,
  metadata: Record<string, unknown>
): Promise<string> {
  await mkdir(workDir, { recursive: true });
  const metaPath = path.join(workDir, "metadata.json");
  await writeFile(metaPath, JSON.stringify(metadata, null, 2), "utf8");
  return metaPath;
}

export async function readMetadata(workDir: string): Promise<Record<string, unknown>> {
  const metaPath = path.join(workDir, "metadata.json");
  const raw = await readFile(metaPath, "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}
