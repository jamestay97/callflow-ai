/**
 * Free AI visuals for professional kids-series look.
 *
 * Primary (free, no key): Pollinations images → FFmpeg Ken Burns + captions
 * Optional: POLLINATIONS_API_KEY → text-to-video (wan / ltx) with free Pollen
 * Fallback: Three.js 3D renderer (via visuals.ts)
 *
 * Free-tool research (2026):
 * - Pollinations image API: free, no card — best automated path for cartoon frames
 * - Kling / Hailuo / Luma / Runway: free web credits exist, but watermarks + no free API
 * - Gemini image models: generally paid on free tier for image generation
 * - Pollinations video: needs API key + free Pollen grants (enter.pollinations.ai)
 */

import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import type { CharacterId, Scene, SceneMood } from "./types.js";
import { config } from "./config.js";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const WIDTH = 1280;
const HEIGHT = 720;

const CHARACTER_VISUAL: Record<CharacterId, string> = {
  bunny: "cute fluffy white bunny character",
  panda: "cute chubby baby panda character",
  dolphin: "friendly blue cartoon dolphin",
  owl: "cute wise brown owl character",
  fox: "playful orange fox cub character",
  turtle: "smiling green cartoon turtle",
  koala: "cuddly gray koala character",
  duck: "bright yellow duckling character",
  star: "cute glowing yellow star character with a face",
  buddy: "friendly round blue cartoon mascot",
};

const MOOD_ACTION: Record<SceneMood, string> = {
  intro: "waving hello happily",
  lesson: "teaching and pointing cheerfully",
  story: "playing in a colorful adventure",
  celebrate: "jumping for joy with confetti",
  outro: "waving goodbye warmly",
};

const MOOD_BG: Record<SceneMood, string> = {
  intro: "bright sunny playground with rainbow",
  lesson: "colorful kids classroom garden",
  story: "magical candy-colored forest",
  celebrate: "party meadow with balloons",
  outro: "golden sunset hill with flowers",
};

function runFfmpeg(command: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    command.on("end", () => resolve()).on("error", reject);
  });
}

/** Keep prompts short — long style locks confuse free image models. */
export function buildSceneImagePrompt(scene: Scene): string {
  if (scene.visualPrompt?.trim()) {
    return `${scene.visualPrompt.trim()}, 2D preschool educational cartoon, flat vector animation, clean outlines, soft cel shading, bright colors, no 3D, no text`;
  }

  const character = (scene.character ?? "buddy") as CharacterId;
  const mood = (scene.mood ?? "story") as SceneMood;

  return [
    CHARACTER_VISUAL[character] ?? CHARACTER_VISUAL.buddy,
    MOOD_ACTION[mood] ?? MOOD_ACTION.story,
    MOOD_BG[mood] ?? MOOD_BG.story,
    "2D preschool educational cartoon",
    "flat vector animation",
    "clean black outlines",
    "soft cel shading",
    "bright candy colors",
    "children's TV show",
    "no 3D",
    "no CGI",
    "no text",
  ].join(", ");
}

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "")
    .replace(/\n/g, " ")
    .slice(0, 140);
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "kids-youtube-bot/1.0" },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function generateSceneImage(
  scene: Scene,
  outPath: string,
  seed: number
): Promise<void> {
  const prompt = buildSceneImagePrompt(scene);
  const encoded = encodeURIComponent(prompt);
  // Prefer turbo — follows short cartoon prompts reliably on free tier
  const models = ["turbo", "flux", "sana"];

  let lastError: unknown;
  for (const model of models) {
    const url =
      `https://image.pollinations.ai/prompt/${encoded}` +
      `?width=${WIDTH}&height=${HEIGHT}&nologo=true&model=${model}&seed=${seed}`;

    try {
      const res = await fetchWithTimeout(url, 90_000);
      if (!res.ok) {
        lastError = new Error(`Pollinations ${model} HTTP ${res.status}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 5_000) {
        lastError = new Error(`Pollinations ${model} returned empty image`);
        continue;
      }
      await writeFile(outPath, buf);
      return;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function tryGenerateAiVideoClip(
  scene: Scene,
  duration: number,
  outPath: string
): Promise<boolean> {
  const apiKey = config.pollinationsApiKey;
  if (!apiKey) {
    console.log("    AI video skipped (no POLLINATIONS_API_KEY)");
    return false;
  }

  const prompt = buildSceneImagePrompt(scene);
  const encoded = encodeURIComponent(prompt);
  const seconds = Math.min(8, Math.max(4, Math.round(duration)));
  const models = ["wan", "ltx-2", "wan-fast"];

  for (const model of models) {
    const url =
      `https://gen.pollinations.ai/video/${encoded}` +
      `?model=${model}&duration=${seconds}&aspectRatio=16:9&key=${encodeURIComponent(apiKey)}`;
    try {
      console.log(`    Trying Pollinations video (${model}, ${seconds}s)...`);
      const res = await fetchWithTimeout(url, 180_000);
      if (!res.ok) {
        console.log(`    ${model} HTTP ${res.status}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 20_000) {
        console.log(`    ${model} returned tiny payload (${buf.length} bytes)`);
        continue;
      }

      const rawPath = outPath.replace(/\.mp4$/, "-raw.mp4");
      await writeFile(rawPath, buf);
      await runFfmpeg(
        ffmpeg(rawPath)
          .inputOptions(["-stream_loop", "-1"])
          .outputOptions([
            "-t", String(duration),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-an",
            "-r", "30",
            "-movflags", "+faststart",
          ])
          .save(outPath)
      );
      console.log(`    AI video OK (${model}, ${(buf.length / 1024).toFixed(0)} KB)`);
      return true;
    } catch (err) {
      console.log(`    ${model} failed: ${err instanceof Error ? err.message : err}`);
      continue;
    }
  }

  console.log("    AI video unavailable — using illustrated keyframes");
  return false;
}

export async function animateImageToClip(
  imagePath: string,
  duration: number,
  outPath: string,
  caption: string,
  mood: SceneMood = "story"
): Promise<void> {
  const frames = Math.max(30, Math.ceil(duration * 30));
  const zoomEnd =
    mood === "celebrate" ? 1.2 : mood === "intro" || mood === "outro" ? 1.14 : 1.1;
  const zoomExpr = `min(zoom+0.0009,${zoomEnd.toFixed(2)})`;
  const safeCaption = escapeDrawtext(caption);

  const zoomPart =
    `scale=1600:900:force_original_aspect_ratio=increase,` +
    `crop=1600:900,` +
    `zoompan=z='${zoomExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)-20':d=${frames}:s=${WIDTH}x${HEIGHT}:fps=30`;

  const captionPart = safeCaption
    ? `,drawbox=x=40:y=ih-150:w=iw-80:h=120:color=white@0.88:t=fill,` +
      `drawtext=text='${safeCaption}':fontcolor=#1a1a2e:fontsize=34:font=Arial:` +
      `x=(w-text_w)/2:y=h-120:line_spacing=8`
    : "";

  const filter = `${zoomPart}${captionPart},format=yuv420p`;

  await runFfmpeg(
    ffmpeg(imagePath)
      .outputOptions([
        "-vf", filter,
        "-t", String(duration),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-r", "30",
        "-movflags", "+faststart",
      ])
      .save(outPath)
  );
}

export async function renderAiSceneClip(
  scene: Scene,
  sceneIndex: number,
  duration: number,
  workDir: string,
  seedBase: number
): Promise<string> {
  await mkdir(workDir, { recursive: true });
  const prefix = `scene-${String(sceneIndex).padStart(2, "0")}`;
  const clipPath = path.join(workDir, `${prefix}.mp4`);

  const usedVideo = await tryGenerateAiVideoClip(scene, duration, clipPath);
  if (usedVideo) {
    // Burn caption onto AI video
    const captioned = path.join(workDir, `${prefix}-captioned.mp4`);
    const safeCaption = escapeDrawtext(scene.text);
    try {
      await runFfmpeg(
        ffmpeg(clipPath)
          .outputOptions([
            "-vf",
            `drawbox=x=40:y=ih-150:w=iw-80:h=120:color=white@0.88:t=fill,` +
              `drawtext=text='${safeCaption}':fontcolor=#1a1a2e:fontsize=34:font=Arial:` +
              `x=(w-text_w)/2:y=h-120`,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-an",
            "-t", String(duration),
          ])
          .save(captioned)
      );
      await copyFile(captioned, clipPath);
    } catch {
      // keep uncaptioned AI clip
    }
    return clipPath;
  }

  const imagePath = path.join(workDir, `${prefix}.jpg`);
  await generateSceneImage(scene, imagePath, seedBase + sceneIndex * 17);
  await animateImageToClip(imagePath, duration, clipPath, scene.text, scene.mood ?? "story");
  return clipPath;
}

export async function renderAllAiClips(
  scenes: Scene[],
  durations: number[],
  workDir: string
): Promise<string[]> {
  await mkdir(workDir, { recursive: true });
  const seedBase = Math.floor(Date.now() / 1000) % 100_000;
  const clips: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]!;
    const duration = Math.max(2.5, durations[i] ?? 5);
    console.log(
      `  AI kids-series scene ${i + 1}/${scenes.length} (${scene.character ?? "buddy"}, ${scene.mood ?? "story"})...`
    );
    clips.push(await renderAiSceneClip(scene, i, duration, workDir, seedBase));
  }

  return clips;
}
