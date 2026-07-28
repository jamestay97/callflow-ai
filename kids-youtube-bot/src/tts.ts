import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { EdgeTTS } from "edge-tts-universal";
import type { Scene } from "./types.js";
import { getAudioDuration } from "./audioUtils.js";

export interface SceneAudio {
  sceneIndex: number;
  audioPath: string;
  durationSeconds: number;
}

async function synthesizeScene(text: string, voice: string, outPath: string): Promise<number> {
  const tts = new EdgeTTS(text, voice);
  const result = await tts.synthesize();
  const buffer = Buffer.from(await result.audio.arrayBuffer());
  await writeFile(outPath, buffer);

  try {
    return await getAudioDuration(outPath);
  } catch {
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(4, words / 2.2);
  }
}

export async function generateSceneAudio(
  scenes: Scene[],
  workDir: string,
  voice: string
): Promise<SceneAudio[]> {
  await mkdir(workDir, { recursive: true });
  const results: SceneAudio[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const audioPath = path.join(workDir, `scene-${String(i).padStart(2, "0")}.mp3`);
    const durationSeconds = await synthesizeScene(scenes[i]!.text, voice, audioPath);
    results.push({ sceneIndex: i, audioPath, durationSeconds });
  }

  return results;
}
