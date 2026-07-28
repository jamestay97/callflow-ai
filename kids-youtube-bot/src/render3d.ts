import http from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, type Browser } from "playwright";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import type { Scene } from "./types.js";
import type { CharacterId, SceneMood } from "./types.js";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCENE_HTML = path.join(ROOT, "assets", "3d", "scene.html");
export const RENDER_FPS = 24;
const WIDTH = 1280;
const HEIGHT = 720;

function runFfmpeg(command: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    command.on("end", () => resolve()).on("error", reject);
  });
}

function contentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json";
    case ".map":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

/** Tiny static file server so ES modules + import maps resolve under http:// */
export async function startAssetServer(): Promise<{ port: number; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
      const safe = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
      const filePath = path.join(ROOT, safe === path.sep || safe === "/" ? "assets/3d/scene.html" : safe);

      if (!filePath.startsWith(ROOT) || !existsSync(filePath)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      res.writeHead(200, {
        "Content-Type": contentType(filePath),
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      });
      createReadStream(filePath).pipe(res);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.on("error", reject);
  });

  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Failed to bind asset server");

  return {
    port: addr.port,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

function buildSceneUrl(
  port: number,
  scene: Scene,
  options?: {
    greenscreen?: boolean;
    talkingCloseup?: boolean;
    showMode?: boolean;
    props?: string;
  }
): string {
  const q = new URLSearchParams({
    character: scene.character ?? "buddy",
    mood: scene.mood ?? "story",
    bg: scene.backgroundColor ?? "#4D96FF",
    emoji: scene.emoji ?? "⭐",
    text: scene.text.slice(0, 220),
    greenscreen: options?.greenscreen ? "1" : "0",
    talking: options?.talkingCloseup ? "1" : "0",
    show: options?.showMode ? "1" : "0",
    props: options?.props ?? "",
  });
  return `http://127.0.0.1:${port}/assets/3d/scene.html?${q.toString()}`;
}

export async function encodeFramesToClip(
  framesDir: string,
  fps: number,
  duration: number,
  outPath: string
): Promise<void> {
  await runFfmpeg(
    ffmpeg()
      .input(path.join(framesDir, "frame-%04d.png"))
      .inputOptions(["-framerate", String(fps)])
      .outputOptions([
        "-t",
        String(duration),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-r",
        "30",
        "-movflags",
        "+faststart",
      ])
      .save(outPath)
  );
}

let sharedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.isConnected()) return sharedBrowser;
  sharedBrowser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"],
  });
  return sharedBrowser;
}

export async function closeRenderBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => undefined);
    sharedBrowser = null;
  }
}

export interface CaptureOptions {
  mouthCurve?: number[];
  greenscreen?: boolean;
  talkingCloseup?: boolean;
  /** Full cartoon-show mode: animated world + lesson props + lip sync */
  showMode?: boolean;
  /** Lesson props string, e.g. numbers:1,2,3 or colors:red,blue */
  props?: string;
  fps?: number;
}

export async function captureSceneFrames(
  scene: Scene,
  duration: number,
  framesDir: string,
  port: number,
  fps = RENDER_FPS,
  options: CaptureOptions = {}
): Promise<number> {
  await mkdir(framesDir, { recursive: true });
  const browser = await getBrowser();
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });

  try {
    const url = buildSceneUrl(port, scene, {
      greenscreen: options.greenscreen,
      talkingCloseup: options.talkingCloseup,
      showMode: options.showMode,
      props: options.props,
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, null, {
      timeout: 45000,
    });

    const frameCount = Math.max(1, Math.ceil(duration * fps));
    const mouthCurve = options.mouthCurve ?? [];

    for (let f = 0; f < frameCount; f++) {
      const progress = frameCount <= 1 ? 0 : f / (frameCount - 1);
      const mouth = mouthCurve[f] ?? mouthCurve[mouthCurve.length - 1] ?? 0;
      await page.evaluate(
        ({ p, m }) => {
          (window as unknown as { __setFrame: (n: number, mouth?: number) => void }).__setFrame(p, m);
        },
        { p: progress, m: mouth }
      );
      await new Promise((r) => setTimeout(r, 12));
      const framePath = path.join(framesDir, `frame-${String(f).padStart(4, "0")}.png`);
      await page.screenshot({
        path: framePath,
        type: "png",
        clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
      });
    }
    return frameCount;
  } finally {
    await page.close();
  }
}

export async function render3dSceneClip(
  scene: Scene,
  sceneIndex: number,
  duration: number,
  workDir: string,
  port: number
): Promise<string> {
  const prefix = `scene-${String(sceneIndex).padStart(2, "0")}`;
  const framesDir = path.join(workDir, `${prefix}-frames`);
  const clipPath = path.join(workDir, `${prefix}.mp4`);

  await captureSceneFrames(scene, duration, framesDir, port, RENDER_FPS);
  await encodeFramesToClip(framesDir, RENDER_FPS, duration, clipPath);
  return clipPath;
}

export async function renderAll3dClips(
  scenes: Scene[],
  durations: number[],
  workDir: string
): Promise<string[]> {
  await mkdir(workDir, { recursive: true });
  const server = await startAssetServer();
  const clips: string[] = [];

  try {
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i]!;
      const duration = Math.max(2, durations[i] ?? 5);
      console.log(
        `  3D render scene ${i + 1}/${scenes.length} (${scene.character ?? "buddy"}, ${scene.mood ?? "story"}, ${duration.toFixed(1)}s)...`
      );
      const clip = await render3dSceneClip(scene, i, duration, workDir, server.port);
      clips.push(clip);
    }
  } finally {
    await server.close();
    await closeRenderBrowser();
  }

  return clips;
}

/** Sanity helper for debugging scene URL generation */
export function sceneFileUrl(): string {
  return pathToFileURL(SCENE_HTML).href;
}

export type { CharacterId, SceneMood };
