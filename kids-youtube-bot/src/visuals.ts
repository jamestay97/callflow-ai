import { mkdir, writeFile } from "node:fs/promises";
import type { Scene } from "./types.js";
import type { SceneAudio } from "./tts.js";
import { config } from "./config.js";
import { renderAllAiClips } from "./aiVisuals.js";
import { renderAll3dClips } from "./render3d.js";
import { renderAllTalkingClips } from "./talkingVisuals.js";
import { renderAllShowClips } from "./showVisuals.js";
import { renderAllCartoon2dClips } from "./cartoon2d.js";

export async function renderSceneClips(
  scenes: Scene[],
  durations: number[],
  workDir: string,
  sceneAudio: SceneAudio[] = []
): Promise<string[]> {
  await mkdir(workDir, { recursive: true });

  const engine = config.visualEngine;

  // Default: Super Simple / preschool 2D cartoon show style
  if (engine === "cartoon2d" || engine === "auto") {
    try {
      console.log("Using 2D preschool cartoon show style (Super Simple–inspired)...");
      return await renderAllCartoon2dClips(scenes, durations, workDir);
    } catch (err) {
      console.warn(
        `2D cartoon failed (${err instanceof Error ? err.message : err}) — trying AI stills.`
      );
    }
  }

  if (engine === "show") {
    try {
      console.log("Using full cartoon-show animation (3D world + lip sync)...");
      return await renderAllShowClips(scenes, sceneAudio, workDir);
    } catch (err) {
      console.warn(
        `Cartoon-show failed (${err instanceof Error ? err.message : err}) — trying talking composite.`
      );
    }
  }

  if (engine === "talking") {
    try {
      console.log("Using lip-synced talking characters + AI backgrounds...");
      return await renderAllTalkingClips(scenes, sceneAudio, workDir);
    } catch (err) {
      console.warn(
        `Talking lip-sync failed (${err instanceof Error ? err.message : err}) — trying AI stills.`
      );
    }
  }

  if (
    engine === "ai" ||
    engine === "talking" ||
    engine === "auto" ||
    engine === "show" ||
    engine === "cartoon2d"
  ) {
    try {
      console.log("Using free AI kids-series visuals (Pollinations)...");
      return await renderAllAiClips(scenes, durations, workDir);
    } catch (err) {
      console.warn(
        `AI visuals failed (${err instanceof Error ? err.message : err}) — falling back to Three.js 3D.`
      );
      return renderAll3dClips(scenes, durations, workDir);
    }
  }

  if (engine === "threed") {
    console.log("Using Three.js 3D renderer...");
    return renderAll3dClips(scenes, durations, workDir);
  }

  return renderAll3dClips(scenes, durations, workDir);
}

export async function writeVideoConcatList(clipPaths: string[], listPath: string): Promise<void> {
  const lines = clipPaths.map((clip) => `file '${clip.replace(/\\/g, "/")}'`);
  await writeFile(listPath, lines.join("\n"), "utf8");
}
