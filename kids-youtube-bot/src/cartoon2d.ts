/**
 * Preschool 2D cartoon show engine.
 *
 * Style target (researched from top kids YouTube):
 * - Super Simple Songs: flat 2D vector characters, soft pastel sets, big eyes, clean outlines
 * - Numberblocks / Alphablocks: simple shapes used as characters (still 2D illustrated)
 * - ChuChu TV / KidsTV123: bright saturated 2D preschool animation
 *
 * Approach (free + automated):
 * - Pollinations images with a locked Super-Simple-like style bible
 * - 3 keyframes per scene (start → mid → end) for real pose changes
 * - FFmpeg crossfades between keyframes + gentle camera drift
 * - Optional Pollinations video when POLLINATIONS_API_KEY has Pollen
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import type { CharacterId, Scene, SceneMood } from "./types.js";
import { config } from "./config.js";
import { tryGenerateAiVideoClip } from "./aiVisuals.js";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const WIDTH = 1280;
const HEIGHT = 720;

/** Shared look across the whole series — matches Super Simple / preschool 2D TV */
const STYLE_BIBLE =
  "2D preschool educational cartoon, flat vector animation, clean black outlines, soft cel shading, " +
  "big round expressive eyes with white shine, simple friendly shapes, bright candy colors, " +
  "soft pastel background, children's TV show still frame, wholesome, no 3D, no CGI, " +
  "no low poly, no plastic toy render, no photoreal, no text, no watermark, no logo";

const CHARACTERS: Record<CharacterId, string> = {
  bunny: "adorable white bunny with long pink inner ears, pink nose, fluffy cheeks",
  panda: "chubby black-and-white baby panda with round ears and rosy cheeks",
  dolphin: "smiling blue cartoon dolphin with big eyes jumping playfully",
  owl: "cute brown owl with big yellow eyes and soft wing feathers",
  fox: "soft orange fox cub with white muzzle, pointy ears, bushy tip tail",
  turtle: "friendly green turtle with patterned shell and big smile",
  koala: "cuddly gray koala with fluffy round ears and big black nose",
  duck: "bright yellow duckling with orange beak and tiny wings",
  star: "happy yellow star character with face, arms, and sparkles",
  buddy: "friendly round blue mascot with soft ears and rosy cheeks",
};

const POSES: Record<SceneMood, [string, string, string]> = {
  intro: [
    "standing center stage waving one paw hello, bright sunny park",
    "hopping forward cheerfully with both arms up, sunny park",
    "big friendly smile looking at camera, sunny park flowers",
  ],
  lesson: [
    "standing beside a big colorful teaching chart, pointing gently",
    "showing a glowing lesson object with both paws, classroom garden",
    "nodding proudly after explaining, soft classroom garden",
  ],
  story: [
    "walking along a candy-colored forest path discovering something",
    "reacting with surprise and delight to a magical friend",
    "sharing happily with a friend under colorful trees",
  ],
  celebrate: [
    "jumping with joy amid confetti and balloons",
    "spinning happily with sparkles and party streamers",
    "arms raised in victory smile, confetti raining down",
  ],
  outro: [
    "waving goodbye with a warm smile, golden hour meadow",
    "blowing a kiss goodbye, soft sunset meadow",
    "waving both paws, walking toward sunset glow",
  ],
};

function runFfmpeg(command: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    command.on("end", () => resolve()).on("error", reject);
  });
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

export function buildCartoon2dPrompt(scene: Scene, keyframeIndex: number): string {
  if (scene.visualPrompt?.trim() && keyframeIndex === 0) {
    return `${scene.visualPrompt.trim()}, ${STYLE_BIBLE}`;
  }

  const character = (scene.character ?? "buddy") as CharacterId;
  const mood = (scene.mood ?? "story") as SceneMood;
  const poses = POSES[mood] ?? POSES.story;
  const pose = poses[Math.min(keyframeIndex, poses.length - 1)]!;
  const who = CHARACTERS[character] ?? CHARACTERS.buddy;

  return `${who}, ${pose}, ${STYLE_BIBLE}`;
}

export async function generateCartoonFrame(
  prompt: string,
  outPath: string,
  seed: number
): Promise<void> {
  const encoded = encodeURIComponent(prompt);
  // flux tends to follow style locks better for 2D illustration
  const models = ["flux", "turbo", "sana"];
  let lastError: unknown;

  for (const model of models) {
    const url =
      `https://image.pollinations.ai/prompt/${encoded}` +
      `?width=${WIDTH}&height=${HEIGHT}&nologo=true&model=${model}&seed=${seed}`;
    try {
      const res = await fetchWithTimeout(url, 100_000);
      if (!res.ok) {
        lastError = new Error(`Pollinations ${model} HTTP ${res.status}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 5_000) {
        lastError = new Error(`Pollinations ${model} empty`);
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

async function burnCaption(clipPath: string, caption: string, duration: number, outPath: string): Promise<void> {
  const safe = escapeDrawtext(caption);
  await runFfmpeg(
    ffmpeg(clipPath)
      .outputOptions([
        "-vf",
        `drawbox=x=48:y=ih-148:w=iw-96:h=112:color=white@0.92:t=fill,` +
          `drawtext=text='${safe}':fontcolor=#1a1a2e:fontsize=32:font=Arial:` +
          `x=(w-text_w)/2:y=h-118`,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-an",
        "-t", String(duration),
        "-movflags", "+faststart",
      ])
      .save(outPath)
  );
}

/** Soft-cut keyframes into a preschool-show style clip with light camera drift */
async function assembleKeyframeClip(
  framePaths: string[],
  duration: number,
  outPath: string
): Promise<void> {
  const n = framePaths.length;
  const segment = duration / n;
  const fade = Math.min(0.35, Math.max(0.12, segment * 0.25));
  const tmpClips: string[] = [];

  for (let i = 0; i < n; i++) {
    const tmp = outPath.replace(/\.mp4$/, `-kf${i}.mp4`);
    tmpClips.push(tmp);
    const frames = Math.max(24, Math.ceil(segment * 30));
    const zoom = 1.05 + i * 0.025;
    await runFfmpeg(
      ffmpeg(framePaths[i]!)
        .outputOptions([
          "-vf",
          `scale=1360:765:force_original_aspect_ratio=increase,crop=1360:765,` +
            `zoompan=z='min(zoom+0.00055,${zoom.toFixed(2)})':x='iw/2-(iw/zoom/2)+${i * 6}':y='ih/2-(ih/zoom/2)':d=${frames}:s=${WIDTH}x${HEIGHT}:fps=30,` +
            `format=yuv420p`,
          "-t", String(segment),
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-r", "30",
          "-an",
        ])
        .save(tmp)
    );
  }

  if (n === 1) {
    await runFfmpeg(ffmpeg(tmpClips[0]!).outputOptions(["-c", "copy"]).save(outPath));
    return;
  }

  // Older ffmpeg (installer build) lacks xfade — use fade + concat
  const cmd = ffmpeg();
  for (const c of tmpClips) cmd.input(c);

  const fadeOutAt = Math.max(0.05, segment - fade).toFixed(2);
  const fadeDur = fade.toFixed(2);
  const filters: string[] = [];
  const labels: string[] = [];

  for (let i = 0; i < n; i++) {
    const label = `v${i}`;
    labels.push(`[${label}]`);
    if (i === 0) {
      filters.push(`[${i}:v]fade=t=out:st=${fadeOutAt}:d=${fadeDur}[${label}]`);
    } else if (i === n - 1) {
      filters.push(`[${i}:v]fade=t=in:d=${fadeDur}[${label}]`);
    } else {
      filters.push(
        `[${i}:v]fade=t=in:d=${fadeDur},fade=t=out:st=${fadeOutAt}:d=${fadeDur}[${label}]`
      );
    }
  }
  filters.push(`${labels.join("")}concat=n=${n}:v=1:a=0,format=yuv420p[v]`);

  await runFfmpeg(
    cmd
      .complexFilter(filters)
      .outputOptions([
        "-map", "[v]",
        "-t", String(duration),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-r", "30",
        "-an",
        "-movflags", "+faststart",
      ])
      .save(outPath)
  );
}

export async function renderCartoon2dSceneClip(
  scene: Scene,
  sceneIndex: number,
  duration: number,
  workDir: string,
  episodeSeed: number
): Promise<string> {
  await mkdir(workDir, { recursive: true });
  const prefix = `scene-${String(sceneIndex).padStart(2, "0")}`;
  const clipPath = path.join(workDir, `${prefix}.mp4`);

  // Prefer true AI video motion when free Pollen is available
  if (await tryGenerateAiVideoClip(scene, duration, clipPath)) {
    const captioned = path.join(workDir, `${prefix}-cap.mp4`);
    try {
      await burnCaption(clipPath, scene.text, duration, captioned);
      await runFfmpeg(ffmpeg(captioned).outputOptions(["-c", "copy"]).save(clipPath));
    } catch {
      /* keep uncaptioned */
    }
    return clipPath;
  }

  // Episode-consistent character seed + scene variation
  const baseSeed = episodeSeed + sceneIndex * 41;
  const framePaths: string[] = [];
  const keyframeCount = duration >= 5 ? 3 : 2;

  for (let k = 0; k < keyframeCount; k++) {
    const framePath = path.join(workDir, `${prefix}-frame${k}.jpg`);
    const prompt = buildCartoon2dPrompt(scene, k);
    // Keep seed close across keyframes so character stays recognizable
    await generateCartoonFrame(prompt, framePath, baseSeed + k);
    framePaths.push(framePath);
    console.log(`    keyframe ${k + 1}/${keyframeCount}`);
  }

  const motionClip = path.join(workDir, `${prefix}-motion.mp4`);
  await assembleKeyframeClip(framePaths, duration, motionClip);

  try {
    await burnCaption(motionClip, scene.text, duration, clipPath);
  } catch {
    await runFfmpeg(ffmpeg(motionClip).outputOptions(["-c", "copy"]).save(clipPath));
  }

  return clipPath;
}

export async function renderAllCartoon2dClips(
  scenes: Scene[],
  durations: number[],
  workDir: string
): Promise<string[]> {
  await mkdir(workDir, { recursive: true });
  // Stable episode seed so character look stays similar across scenes
  const episodeSeed = Math.floor(Date.now() / 86_400_000) % 100_000;
  const clips: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]!;
    const duration = Math.max(2.5, durations[i] ?? 5);
    console.log(
      `  2D preschool cartoon scene ${i + 1}/${scenes.length} (${scene.character ?? "buddy"}, ${scene.mood ?? "story"})...`
    );
    clips.push(await renderCartoon2dSceneClip(scene, i, duration, workDir, episodeSeed));
  }

  return clips;
}
