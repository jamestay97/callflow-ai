/**
 * Cartoon Show engine — fully animated 3D episodes.
 * Character + world + lesson props + lip sync rendered together (no still-image backgrounds).
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Scene } from "./types.js";
import type { SceneAudio } from "./tts.js";
import { analyzeMouthCurve } from "./lipSync.js";
import {
  RENDER_FPS,
  captureSceneFrames,
  closeRenderBrowser,
  encodeFramesToClip,
  startAssetServer,
} from "./render3d.js";

/** Pull counting numbers / color words from scene text for on-screen props */
export function extractShowProps(scene: Scene): string {
  const text = scene.text ?? "";
  const nums = [...text.matchAll(/\b([1-9]|10)\b/g)].map((m) => m[1]!);
  const uniqueNums = [...new Set(nums)].slice(0, 6);
  if (uniqueNums.length) return `numbers:${uniqueNums.join(",")}`;

  const colors = ["red", "blue", "yellow", "green", "orange", "purple", "pink"];
  const found = colors.filter((c) => text.toLowerCase().includes(c));
  if (found.length) return `colors:${found.slice(0, 4).join(",")}`;

  if ((scene.mood ?? "") === "celebrate") return "stars:5";
  return "stars:3";
}

export async function renderShowSceneClip(
  scene: Scene,
  sceneIndex: number,
  duration: number,
  audioPath: string,
  workDir: string,
  port: number
): Promise<string> {
  const prefix = `scene-${String(sceneIndex).padStart(2, "0")}`;
  const framesDir = path.join(workDir, `${prefix}-show-frames`);
  const outPath = path.join(workDir, `${prefix}.mp4`);

  const mouthCurve = await analyzeMouthCurve(audioPath, duration, RENDER_FPS);
  const props = extractShowProps(scene);

  await captureSceneFrames(scene, duration, framesDir, port, RENDER_FPS, {
    mouthCurve,
    greenscreen: false,
    talkingCloseup: false,
    showMode: true,
    props,
  });
  await encodeFramesToClip(framesDir, RENDER_FPS, duration, outPath);
  return outPath;
}

export async function renderAllShowClips(
  scenes: Scene[],
  sceneAudio: SceneAudio[],
  workDir: string
): Promise<string[]> {
  await mkdir(workDir, { recursive: true });
  const server = await startAssetServer();
  const clips: string[] = [];

  try {
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i]!;
      const audio = sceneAudio[i]!;
      const duration = Math.max(2.5, audio?.durationSeconds ?? 5);
      console.log(
        `  Cartoon-show scene ${i + 1}/${scenes.length} (${scene.character ?? "buddy"}, ${scene.mood ?? "story"})...`
      );
      clips.push(
        await renderShowSceneClip(scene, i, duration, audio.audioPath, workDir, server.port)
      );
    }
  } finally {
    await server.close();
    await closeRenderBrowser();
  }

  return clips;
}
