import { access } from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import { URL } from "node:url";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { config } from "./config.js";
import { logInfo } from "./logger.js";

const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];
const TOKEN_PATH = "youtube-token.json";

function getOAuth2Client(): OAuth2Client {
  if (!config.youtubeClientId || !config.youtubeClientSecret) {
    throw new Error("YouTube OAuth credentials missing in .env");
  }
  return new google.auth.OAuth2(
    config.youtubeClientId,
    config.youtubeClientSecret,
    "http://localhost:3000/oauth2callback"
  );
}

async function loadToken(): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(path.join(config.credentialsDir, TOKEN_PATH), "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function saveToken(token: Record<string, unknown>): Promise<void> {
  await mkdir(config.credentialsDir, { recursive: true });
  await writeFile(
    path.join(config.credentialsDir, TOKEN_PATH),
    JSON.stringify(token, null, 2),
    "utf8"
  );
}

async function mergeAndSaveToken(updates: Record<string, unknown>): Promise<void> {
  const existing = (await loadToken()) ?? {};
  await saveToken({ ...existing, ...updates });
}

export async function hasYouTubeToken(): Promise<boolean> {
  const token = await loadToken();
  return Boolean(token && (token.refresh_token || token.access_token));
}

export async function authenticateYouTube(dashboardPort = 3847): Promise<void> {
  const oauth2 = getOAuth2Client();
  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("\n=== YouTube Authorization ===\n");
  console.log(authUrl);
  console.log("\nWaiting for Google sign-in...\n");

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost:3000");
      if (url.pathname !== "/oauth2callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const authCode = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      if (error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h1>Authorization failed</h1><p>${error}</p><p><a href="http://localhost:${dashboardPort}">Back to app</a></p>`);
        reject(new Error(error));
        server.close();
        return;
      }

      if (!authCode) {
        res.writeHead(400);
        res.end("Missing authorization code");
        reject(new Error("OAuth callback missing code"));
        server.close();
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Connected!</title>
<style>body{font-family:system-ui;text-align:center;padding:60px;background:#f0f9ff}
.box{background:white;border-radius:16px;padding:40px;max-width:420px;margin:0 auto;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h1{color:#16a34a}a{color:#2563eb}</style></head>
<body><div class="box"><h1>Channel connected!</h1>
<p>Your YouTube channel is linked. You can close this tab.</p>
<p><a href="http://localhost:${dashboardPort}">Return to Kids YouTube App</a></p></div></body></html>`);
      server.close();
      resolve(authCode);
    });

    server.listen(3000, () => {});
    server.on("error", reject);
  });

  const { tokens } = await oauth2.getToken(code);
  await saveToken(tokens as Record<string, unknown>);
  await logInfo("YouTube channel authorized successfully.");
}

export function getYouTubeAuthUrl(): string {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

async function getAuthorizedClient(): Promise<OAuth2Client> {
  const oauth2 = getOAuth2Client();
  const token = await loadToken();
  if (!token) {
    throw new Error("No YouTube token found. Run: npm run auth");
  }

  oauth2.setCredentials(token);

  oauth2.on("tokens", (tokens) => {
    void mergeAndSaveToken(tokens as Record<string, unknown>);
  });

  return oauth2;
}

export async function verifyYouTubeConnection(): Promise<{ channelTitle: string; channelId: string }> {
  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: "v3", auth });
  const res = await youtube.channels.list({ part: ["snippet"], mine: true });
  const channel = res.data.items?.[0];
  if (!channel?.id || !channel.snippet?.title) {
    throw new Error("Could not find a YouTube channel for this account.");
  }
  return { channelTitle: channel.snippet.title, channelId: channel.id };
}

export interface UploadOptions {
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
}

export async function uploadToYouTube(options: UploadOptions): Promise<string> {
  await access(options.videoPath);

  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: "v3", auth });

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: options.title.slice(0, 100),
        description: options.description,
        tags: options.tags,
        categoryId: "27",
        defaultLanguage: "en",
      },
      status: {
        privacyStatus: config.privacyStatus,
        selfDeclaredMadeForKids: true,
        madeForKids: true,
      },
    },
    media: {
      body: createReadStream(options.videoPath),
    },
  });

  const videoId = res.data.id;
  if (!videoId) throw new Error("Upload succeeded but no video ID returned");
  return videoId;
}

export async function uploadWithRetry(options: UploadOptions): Promise<string> {
  let lastError: unknown;
  const attempts = Math.max(1, config.uploadRetries);

  for (let i = 1; i <= attempts; i++) {
    try {
      await logInfo(`Upload attempt ${i}/${attempts}: ${options.title}`);
      return await uploadToYouTube(options);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (i < attempts) {
        const waitMs = i * 5000;
        await logInfo(`Upload failed (${msg}). Retrying in ${waitMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }

  throw lastError;
}
