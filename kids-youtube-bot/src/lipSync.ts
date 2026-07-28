import { spawn } from "node:child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

/**
 * Build a per-frame mouth openness curve (0..1) from narration audio.
 * Uses RMS energy so the mouth opens when the character is speaking.
 */
export async function analyzeMouthCurve(
  audioPath: string,
  durationSeconds: number,
  fps: number
): Promise<number[]> {
  const frameCount = Math.max(1, Math.ceil(durationSeconds * fps));
  const sampleRate = 24_000;
  const pcm = await decodeMonoPcm16(audioPath, sampleRate);
  if (pcm.length < sampleRate / 10) {
    return Array.from({ length: frameCount }, () => 0);
  }

  const samplesPerFrame = Math.max(1, Math.floor(sampleRate / fps));
  const raw: number[] = [];

  for (let f = 0; f < frameCount; f++) {
    const start = f * samplesPerFrame;
    const end = Math.min(pcm.length, start + samplesPerFrame);
    if (start >= pcm.length) {
      raw.push(0);
      continue;
    }

    let sum = 0;
    let peak = 0;
    for (let i = start; i < end; i++) {
      const v = Math.abs(pcm[i]!);
      sum += v * v;
      if (v > peak) peak = v;
    }
    const rms = Math.sqrt(sum / Math.max(1, end - start));
    // Emphasize speech; ignore tiny noise
    const level = Math.max(rms * 4.5, peak * 1.8);
    raw.push(level);
  }

  // Normalize against percentile so quiet/loud voices both work
  const sorted = [...raw].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 1;
  const floor = sorted[Math.floor(sorted.length * 0.2)] ?? 0;
  const span = Math.max(0.0001, p95 - floor);

  const normalized = raw.map((v) => {
    const n = (v - floor) / span;
    if (n < 0.08) return 0;
    return Math.min(1, Math.pow(n, 0.85));
  });

  // Light smoothing so mouth doesn't flicker
  return smoothCurve(normalized, 2);
}

function smoothCurve(values: number[], radius: number): number[] {
  const out = values.slice();
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i - radius; j <= i + radius; j++) {
      if (j < 0 || j >= values.length) continue;
      sum += values[j]!;
      count++;
    }
    out[i] = sum / count;
  }
  return out;
}

function decodeMonoPcm16(audioPath: string, sampleRate: number): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const ff = spawn(
      ffmpegInstaller.path,
      [
        "-i",
        audioPath,
        "-ac",
        "1",
        "-ar",
        String(sampleRate),
        "-f",
        "s16le",
        "-acodec",
        "pcm_s16le",
        "pipe:1",
      ],
      { windowsHide: true }
    );

    ff.stdout.on("data", (c: Buffer) => chunks.push(c));
    ff.stderr.on("data", () => {
      // ffmpeg progress logs — ignore
    });
    ff.on("error", reject);
    ff.on("close", (code) => {
      if (code !== 0 && chunks.length === 0) {
        reject(new Error(`ffmpeg PCM decode failed (code ${code})`));
        return;
      }
      const buf = Buffer.concat(chunks);
      const samples = new Float32Array(buf.length / 2);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = buf.readInt16LE(i * 2) / 32768;
      }
      resolve(samples);
    });
  });
}
