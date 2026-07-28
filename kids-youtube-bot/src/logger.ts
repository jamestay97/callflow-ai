import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";

function timestamp(): string {
  return new Date().toISOString();
}

function logLine(level: string, message: string): string {
  return `[${timestamp()}] [${level}] ${message}`;
}

export async function initLogger(): Promise<void> {
  await mkdir(config.logsDir, { recursive: true });
}

export async function logInfo(message: string): Promise<void> {
  const line = logLine("INFO", message);
  console.log(line);
  await appendFile(path.join(config.logsDir, "automation.log"), line + "\n", "utf8");
}

export async function logWarn(message: string): Promise<void> {
  const line = logLine("WARN", message);
  console.warn(line);
  await appendFile(path.join(config.logsDir, "automation.log"), line + "\n", "utf8");
}

export async function logError(message: string): Promise<void> {
  const line = logLine("ERROR", message);
  console.error(line);
  await appendFile(path.join(config.logsDir, "automation.log"), line + "\n", "utf8");
}
