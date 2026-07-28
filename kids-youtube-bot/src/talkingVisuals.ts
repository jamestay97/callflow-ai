/**
 * Talking kids-series renderer:
 * - Bright AI animal-world backgrounds (Pollinations)
 * - 3D character with mouth lip-synced to TTS audio
 * - Chromakey composite so the character talks over the scene
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import type { Scene } from "./types.js";
import type { SceneAudio } from "./tts.js";
import { analyzeMouthCurve } from "./lipSync.js";
import { generateSceneImage, animateImageToClip } from "./aiVisuals.js";
import {
  RENDER_FPS,
  captureSceneFrames,
  closeRenderBrowser,
  encodeFramesToClip,
  startAssetServer,
} from "./render3d.js";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

function runFfmpeg(command: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    command.on("end", () => resolve()).on("error", reject);
  });
}

async function chromakeyOverlay(
  backgroundClip: string,
  characterClip: string,
  outPath: string,
  duration: number
): Promise<void> {
  // Green screen key + soft edge; character slightly lower-third / center
  await runFfmpeg(
    ffmpeg()
      .input(backgroundClip)
      .input(characterClip)
      .complexFilter([
        "[1:v]chromakey=0x00FF00:0.22:0.12,format=rgba,scale=iw*1.12:ih*1.12[char]",
        "[0:v][char]overlay=(W-w)/2:(H-h)/2+16:format=auto,format=yuv420p[out]",
      ])
      .outputOptions([
        "-map", "[out]",
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

function backgroundScene(scene: Scene): Scene {
  // Ask AI for environment without a speaking face (character is 3D + lips)
  const mood = scene.mood ?? "story";
  const places: Record<string, string> = {
    intro: "bright sunny kids playground with rainbow and flowers, empty stage center",
    lesson: "colorful preschool classroom garden with toys, empty center",
    story: "magical candy-colored forest clearing, empty center for a character",
    celebrate: "party meadow with balloons and confetti, empty center",
    outro: "golden sunset hill with flowers, empty center",
  };
  return {
    ...scene,
    visualPrompt: `${places[mood] ?? places.story}, bright saturated kids cartoon background, 3D animated preschool show, no characters, no animals, no people, no text`,
  };
}

export async function renderTalkingSceneClip(
  scene: Scene,
  sceneIndex: number,
  duration: number,
  audioPath: string,
  workDir: string,
  port: number,
  seedBase: number
): Promise<string> {
  const prefix = `scene-${String(sceneIndex).padStart(2, "0")}`;
  const framesDir = path.join(workDir, `${prefix}-talk-frames`);
  const characterClip = path.join(workDir, `${prefix}-character.mp4`);
  const bgImage = path.join(workDir, `${prefix}-bg.jpg`);
  const bgClip = path.join(workDir, `${prefix}-bg.mp4`);
  const outPath = path.join(workDir, `${prefix}.mp4`);

  const mouthCurve = await analyzeMouthCurve(audioPath, duration, RENDER_FPS);

  // 1) Lip-synced character on green screen
  await captureSceneFrames(scene, duration, framesDir, port, RENDER_FPS, {
    mouthCurve,
    greenscreen: true,
    talkingCloseup: true,
  });
  await encodeFramesToClip(framesDir, RENDER_FPS, duration, characterClip);

  // 2) Bright AI background
  try {
    await generateSceneImage(backgroundScene(scene), bgImage, seedBase + sceneIndex * 31);
    await animateImageToClip(bgImage, duration, bgClip, "", scene.mood ?? "story");
  } catch {
    // Solid bright fallback bg if AI fails
    await runFfmpeg(
      ffmpeg()
        .input(`color=c=${(scene.backgroundColor ?? "#6BCBFF").replace("#", "0x")}:s=1280x720:d=${duration}`)
        .inputOptions(["-f", "lavfi"])
        .outputOptions(["-c:v", "libx264", "-pix_fmt", "yuv420p", "-t", String(duration)])
        .save(bgClip)
    );
  }

  // 3) Composite character over AI background
  const composited = path.join(workDir, `${prefix}-comp.mp4`);
  try {
    await chromakeyOverlay(bgClip, characterClip, composited, duration);
  } catch {
    await runFfmpeg(
      ffmpeg(characterClip)
        .outputOptions(["-c", "copy", "-t", String(duration)])
        .save(composited)
    );
  }

  // 4) Burn narration caption so audience can follow along
  const safe = scene.text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "")
    .replace(/\n/g, " ")
    .slice(0, 140);
  try {
    await runFfmpeg(
      ffmpeg(composited)
        .outputOptions([
          "-vf",
          `drawbox=x=40:y=ih-150:w=iw-80:h=120:color=white@0.88:t=fill,` +
            `drawtext=text='${safe}':fontcolor=#1a1a2e:fontsize=34:font=Arial:x=(w-text_w)/2:y=h-120`,
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-an",
          "-t", String(duration),
          "-movflags", "+faststart",
        ])
        .save(outPath)
    );
  } catch {
    await runFfmpeg(
      ffmpeg(composited).outputOptions(["-c", "copy"]).save(outPath)
    );
  }

  return outPath;
}

export async function renderAllTalkingClips(
  scenes: Scene[],
  sceneAudio: SceneAudio[],
  workDir: string
): Promise<string[]> {
  await mkdir(workDir, { recursive: true });
  const server = await startAssetServer();
  const seedBase = Math.floor(Date.now() / 1000) % 100_000;
  const clips: string[] = [];

  try {
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i]!;
      const audio = sceneAudio[i]!;
      const duration = Math.max(2.5, audio?.durationSeconds ?? 5);
      console.log(
        `  Talking lip-sync scene ${i + 1}/${scenes.length} (${scene.character ?? "buddy"}, ${scene.mood ?? "story"})...`
      );
      clips.push(
        await renderTalkingSceneClip(
          scene,
          i,
          duration,
          audio.audioPath,
          workDir,
          server.port,
          seedBase
        )
      );
    }
  } finally {
    await server.close();
    await closeRenderBrowser();
  }

  return clips;
}
