import http from "node:http";
import { spawn } from "node:child_process";
import { URL } from "node:url";
import { config } from "./config.js";
import { ensureEnvFile, updateEnvFile } from "./envManager.js";
import { getAppStatus } from "./status.js";
import { initLogger, logError, logInfo } from "./logger.js";
import { runDailyJob } from "./automation.js";
import { createDailyVideo, uploadTodayVideo, uploadVideoByDate } from "./pipeline.js";
import { authenticateYouTube, getYouTubeAuthUrl } from "./youtubeUpload.js";
import { validateYouTubeConfig } from "./config.js";
import { APP_VERSION, getVideoPathForDate, streamVideo } from "./launch.js";
import { getHealthCheck } from "./testLaunch.js";

interface JobState {
  id: string;
  type: string;
  status: "running" | "success" | "error";
  message: string;
  result?: string;
  startedAt: string;
}

let currentJob: JobState | null = null;

function json(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function readBody(req: http.IncomingMessage): Promise<Record<string, string>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

async function runJob(type: string, fn: () => Promise<string | null | void>): Promise<void> {
  if (currentJob?.status === "running") {
    throw new Error("A job is already running. Please wait.");
  }

  const job: JobState = {
    id: Date.now().toString(),
    type,
    status: "running",
    message: `Running ${type}...`,
    startedAt: new Date().toISOString(),
  };
  currentJob = job;

  try {
    const result = await fn();
    job.status = "success";
    job.message = result ? String(result) : `${type} completed successfully.`;
    job.result = result ? String(result) : undefined;
    await logInfo(`Job ${type} succeeded: ${job.message}`);
  } catch (err) {
    job.status = "error";
    job.message = err instanceof Error ? err.message : String(err);
    await logError(`Job ${type} failed: ${job.message}`);
  }
}

function openBrowser(url: string): void {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
  } else if (process.platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  }
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kids YouTube Studio</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Segoe UI,system-ui,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;color:#1e293b}
  .wrap{max-width:900px;margin:0 auto;padding:32px 20px}
  h1{color:#fff;font-size:1.75rem;margin-bottom:4px}
  .sub{color:rgba(255,255,255,.85);margin-bottom:28px;font-size:.95rem}
  .card{background:#fff;border-radius:16px;padding:24px;margin-bottom:20px;box-shadow:0 8px 32px rgba(0,0,0,.12)}
  .card h2{font-size:1.1rem;margin-bottom:16px;display:flex;align-items:center;gap:8px}
  .step-num{background:#667eea;color:#fff;width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:700}
  .status-row{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#f8fafc;border-radius:10px;margin-bottom:12px}
  .dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
  .dot.ok{background:#22c55e}.dot.warn{background:#f59e0b}.dot.err{background:#ef4444}
  label{display:block;font-size:.85rem;font-weight:600;margin-bottom:6px;color:#475569}
  input,select{width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:.95rem;margin-bottom:12px}
  input:focus,select:focus{outline:none;border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,.2)}
  .btn{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border:none;border-radius:10px;font-size:.95rem;font-weight:600;cursor:pointer;transition:transform .1s,opacity .1s}
  .btn:active{transform:scale(.98)}
  .btn:disabled{opacity:.5;cursor:not-allowed}
  .btn-primary{background:#667eea;color:#fff}
  .btn-primary:hover:not(:disabled){background:#5a6fd6}
  .btn-red{background:#ef4444;color:#fff}
  .btn-red:hover:not(:disabled){background:#dc2626}
  .btn-green{background:#22c55e;color:#fff}
  .btn-green:hover:not(:disabled){background:#16a34a}
  .btn-outline{background:#fff;color:#667eea;border:2px solid #667eea}
  .btn-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
  .help{font-size:.8rem;color:#64748b;margin-top:8px;line-height:1.5}
  .help a{color:#667eea}
  .video-list{margin-top:12px}
  .video-item{display:flex;align-items:center;justify-content:space-between;padding:12px;background:#f8fafc;border-radius:8px;margin-bottom:8px;gap:12px}
  .video-item .title{font-weight:600;font-size:.9rem}
  .video-item .meta{font-size:.8rem;color:#64748b}
  .badge{font-size:.75rem;padding:3px 8px;border-radius:999px;font-weight:600}
  .badge-live{background:#dcfce7;color:#166534}
  .badge-local{background:#fef3c7;color:#92400e}
  .log{padding:12px;background:#1e293b;color:#e2e8f0;border-radius:8px;font-family:Consolas,monospace;font-size:.8rem;min-height:48px;margin-top:12px;white-space:pre-wrap}
  .hidden{display:none}
  .channel-name{font-size:1.2rem;font-weight:700;color:#667eea}
  .test-banner{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;padding:10px 16px;border-radius:10px;margin-bottom:20px;font-size:.9rem;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
  .version-badge{background:rgba(255,255,255,.25);padding:4px 10px;border-radius:999px;font-size:.75rem;font-weight:700}
  .preview-box{margin-top:16px;background:#0f172a;border-radius:12px;padding:12px}
  .preview-box video{width:100%;border-radius:8px;max-height:360px;background:#000}
  .preview-label{color:#94a3b8;font-size:.8rem;margin-bottom:8px}
  .checklist{font-size:.85rem;color:#475569;line-height:1.8}
  .checklist li.ok{color:#16a34a}.checklist li.pending{color:#64748b}
</style>
</head>
<body>
<div class="wrap">
  <div class="test-banner">
    <span id="testBannerText">Test build — connect YouTube when ready to upload live</span>
    <span class="version-badge" id="versionBadge">v0.1.0-test</span>
  </div>
  <h1>Kids YouTube Studio</h1>
  <p class="sub">Create AI kids videos and upload to your YouTube channel</p>

  <div class="card" id="previewCard" style="display:none">
    <h2>Video preview</h2>
    <div class="preview-label" id="previewTitle"></div>
    <div class="preview-box">
      <video id="previewPlayer" controls playsinline></video>
    </div>
  </div>

  <div class="card">
    <h2>Test checklist</h2>
    <ul class="checklist" id="checklist">
      <li class="pending">Loading...</li>
    </ul>
  </div>

  <div class="card">
    <h2><span class="step-num">1</span> Connect YouTube API</h2>
    <p class="help" style="margin-bottom:12px">Get free credentials from <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a> → YouTube Data API v3 → OAuth Desktop app. Redirect URI: <code>http://localhost:3000/oauth2callback</code></p>
    <label>YouTube Client ID</label>
    <input id="clientId" placeholder="xxxx.apps.googleusercontent.com">
    <label>YouTube Client Secret</label>
    <input id="clientSecret" type="password" placeholder="GOCSPX-...">
    <label>Channel display name</label>
    <input id="channelName" placeholder="Learning Adventures for Kids">
    <label>Video privacy</label>
    <select id="privacy">
      <option value="public">Public</option>
      <option value="unlisted">Unlisted</option>
      <option value="private">Private</option>
    </select>
    <div class="btn-row">
      <button class="btn btn-primary" onclick="saveCredentials()">Save credentials</button>
    </div>
  </div>

  <div class="card">
    <h2><span class="step-num">2</span> Link your channel</h2>
    <div id="connectionStatus"></div>
    <div class="btn-row">
      <button class="btn btn-red" id="connectBtn" onclick="connectChannel()">Connect YouTube Channel</button>
    </div>
    <p class="help">Sign in with the Google account that owns your YouTube channel.</p>
  </div>

  <div class="card">
    <h2><span class="step-num">3</span> Create &amp; upload videos</h2>
    <div id="todayStatus"></div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick="runJob('create')">Create today's video</button>
      <button class="btn btn-green" onclick="runJob('upload')">Upload to YouTube</button>
      <button class="btn btn-green" onclick="runJob('run')">Create + Upload</button>
    </div>
    <div id="videoList" class="video-list"></div>
    <div id="jobLog" class="log">Ready.</div>
  </div>
</div>
<script>
async function api(path, opts) {
  const res = await fetch(path, opts);
  return res.json();
}

async function refresh() {
  const s = await api('/api/status');
  document.getElementById('channelName').value = s.channelName || '';
  document.getElementById('privacy').value = s.privacy || 'public';
  if (s.credentials.clientIdSet) document.getElementById('clientId').placeholder = s.credentials.clientIdPreview || 'Saved';

  let conn = '';
  if (s.connectedChannel) {
    conn = '<div class="status-row"><span class="dot ok"></span><span>Connected: <span class="channel-name">' + s.connectedChannel.title + '</span></span></div>';
  } else if (s.hasCredentials && s.connectionError) {
    conn = '<div class="status-row"><span class="dot err"></span><span>Token error — reconnect your channel</span></div>';
  } else if (s.hasCredentials) {
    conn = '<div class="status-row"><span class="dot warn"></span><span>Credentials saved — click Connect below</span></div>';
  } else {
    conn = '<div class="status-row"><span class="dot err"></span><span>Add YouTube API credentials in Step 1</span></div>';
  }
  document.getElementById('connectionStatus').innerHTML = conn;

  let today = '';
  if (s.today.uploaded) {
    today = '<div class="status-row"><span class="dot ok"></span><span>Today uploaded: <a href="' + s.today.youtubeUrl + '" target="_blank">' + s.today.title + '</a></span></div>';
  } else if (s.today.hasVideo) {
    today = '<div class="status-row"><span class="dot warn"></span><span>Video ready: ' + (s.today.title || 'Untitled') + ' — click Upload</span></div>';
  } else {
    today = '<div class="status-row"><span class="dot warn"></span><span>No video yet today — click Create</span></div>';
  }
  document.getElementById('todayStatus').innerHTML = today;

  let list = '';
  for (const v of s.recentVideos) {
    const badge = v.uploaded ? '<span class="badge badge-live">On YouTube</span>' : '<span class="badge badge-local">Local only</span>';
    const uploadBtn = v.uploaded ? '' : '<button class="btn btn-outline" style="padding:6px 12px;font-size:.8rem" onclick="uploadDate(\\'' + v.date + '\\')">Upload</button>';
    const previewBtn = '<button class="btn btn-outline" style="padding:6px 12px;font-size:.8rem" onclick="previewVideo(\\'' + v.date + '\\', \\'' + v.title.replace(/'/g, "") + '\\')">Preview</button>';
    list += '<div class="video-item"><div><div class="title">' + v.title + '</div><div class="meta">' + v.date + '</div></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' + badge + previewBtn + uploadBtn + '</div></div>';
  }
  document.getElementById('videoList').innerHTML = list || '<p class="help">No videos yet — click Create today\\'s video.</p>';

  document.getElementById('versionBadge').textContent = 'v' + s.version;
  document.getElementById('testBannerText').textContent = s.mode === 'production'
    ? 'Live mode — connected to YouTube'
    : 'Test mode — create & preview videos locally, connect YouTube to upload';

  if (s.today.hasVideo && !document.getElementById('previewPlayer').src) {
    previewVideo(s.today.date, s.today.title || 'Today\\'s video');
  }
}

function previewVideo(date, title) {
  const card = document.getElementById('previewCard');
  const player = document.getElementById('previewPlayer');
  document.getElementById('previewTitle').textContent = title + ' (' + date + ')';
  player.src = '/api/video/' + date + '?t=' + Date.now();
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function loadHealth() {
  const h = await api('/api/health');
  const items = [
    ['App configured', h.checks.envFile],
    ['Output folder ready', h.checks.outputDir],
    ['Sample video created', h.checks.hasSampleVideo],
    ['YouTube API credentials', h.checks.youtubeConfigured],
    ['YouTube channel connected', h.checks.youtubeConnected],
  ];
  document.getElementById('checklist').innerHTML = items.map(function(i) {
    return '<li class="' + (i[1] ? 'ok' : 'pending') + '">' + (i[1] ? '✓' : '○') + ' ' + i[0] + '</li>';
  }).join('');
}

async function saveCredentials() {
  const body = {
    clientId: document.getElementById('clientId').value,
    clientSecret: document.getElementById('clientSecret').value,
    channelName: document.getElementById('channelName').value,
    privacy: document.getElementById('privacy').value,
  };
  const r = await api('/api/credentials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  document.getElementById('jobLog').textContent = r.ok ? 'Credentials saved!' : (r.error || 'Failed');
  refresh();
}

async function connectChannel() {
  document.getElementById('connectBtn').disabled = true;
  document.getElementById('jobLog').textContent = 'Opening Google sign-in...';
  const r = await api('/api/connect', { method: 'POST' });
  if (r.authUrl) window.open(r.authUrl, '_blank');
  pollJob();
}

async function runJob(type) {
  document.getElementById('jobLog').textContent = 'Starting ' + type + '...';
  await api('/api/job/' + type, { method: 'POST' });
  pollJob();
}

async function uploadDate(date) {
  document.getElementById('jobLog').textContent = 'Uploading ' + date + '...';
  await api('/api/upload/' + date, { method: 'POST' });
  pollJob();
}

async function pollJob() {
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const j = await api('/api/job');
    if (!j.job) { refresh(); document.getElementById('connectBtn').disabled = false; return; }
    document.getElementById('jobLog').textContent = j.job.message;
    if (j.job.status !== 'running') {
      document.getElementById('connectBtn').disabled = false;
      refresh();
      return;
    }
  }
}

refresh();
loadHealth();
setInterval(refresh, 15000);
</script>
</body>
</html>`;

export async function startDashboard(): Promise<void> {
  await initLogger();
  await ensureEnvFile();

  const port = config.dashboardPort;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const path = url.pathname;

    try {
      if (req.method === "GET" && path === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(HTML);
        return;
      }

      if (req.method === "GET" && path === "/api/health") {
        json(res, 200, await getHealthCheck(port));
        return;
      }

      if (req.method === "GET" && path.startsWith("/api/video/")) {
        const date = path.split("/").pop()?.split("?")[0] ?? "";
        const videoPath = await getVideoPathForDate(date);
        if (!videoPath) {
          json(res, 404, { error: "Video not found for " + date });
          return;
        }
        streamVideo(date, videoPath, res);
        return;
      }

      if (req.method === "GET" && path === "/api/status") {
        json(res, 200, await getAppStatus());
        return;
      }

      if (req.method === "GET" && path === "/api/job") {
        json(res, 200, { job: currentJob });
        return;
      }

      if (req.method === "POST" && path === "/api/credentials") {
        const body = await readBody(req);
        if (!body.clientId?.trim() || !body.clientSecret?.trim()) {
          json(res, 400, { ok: false, error: "Client ID and Client Secret are required." });
          return;
        }
        await updateEnvFile({
          YOUTUBE_CLIENT_ID: body.clientId.trim(),
          YOUTUBE_CLIENT_SECRET: body.clientSecret.trim(),
          CHANNEL_NAME: body.channelName?.trim() || config.channelName,
          YOUTUBE_PRIVACY: body.privacy || "public",
        });
        json(res, 200, { ok: true });
        return;
      }

      if (req.method === "POST" && path === "/api/connect") {
        const errors = validateYouTubeConfig();
        if (errors.length) {
          json(res, 400, { error: errors.join(" ") });
          return;
        }
        const authUrl = getYouTubeAuthUrl();
        void runJob("connect", () => authenticateYouTube(port));
        json(res, 200, { ok: true, authUrl, message: "Complete sign-in in the browser tab." });
        return;
      }

      if (req.method === "POST" && path.startsWith("/api/job/")) {
        const action = path.split("/").pop();
        if (currentJob?.status === "running") {
          json(res, 409, { error: "Job already running" });
          return;
        }
        if (action === "create") {
          void runJob("create", async () => { await createDailyVideo(); return "Video created!"; });
        } else if (action === "upload") {
          void runJob("upload", async () => (await uploadTodayVideo()) ?? "Uploaded!");
        } else if (action === "run") {
          void runJob("run", async () => {
            const result = await runDailyJob();
            if (result.status === "failed") throw new Error(result.message);
            return result.youtubeUrl ?? result.message;
          });
        } else {
          json(res, 404, { error: "Unknown action" });
          return;
        }
        json(res, 200, { ok: true });
        return;
      }

      if (req.method === "POST" && path.startsWith("/api/upload/")) {
        const date = path.split("/").pop()!;
        if (currentJob?.status === "running") {
          json(res, 409, { error: "Job already running" });
          return;
        }
        void runJob("upload", async () => (await uploadVideoByDate(date)) ?? "Uploaded!");
        json(res, 200, { ok: true });
        return;
      }

      res.writeHead(404);
      res.end("Not found");
    } catch (err) {
      json(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.listen(port, () => {
    const appUrl = `http://localhost:${port}`;
    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║   Kids YouTube Studio — TEST BUILD       ║");
    console.log(`║   v${APP_VERSION.padEnd(33)}║`);
    console.log("╚══════════════════════════════════════════╝\n");
    console.log(`  Open in browser: ${appUrl}\n`);
    console.log("  1. Paste YouTube API credentials");
    console.log("  2. Click Connect YouTube Channel");
    console.log("  3. Create + Upload videos\n");
    console.log("  Press Ctrl+C to stop.\n");
    void logInfo(`Dashboard started at ${appUrl}`);
    openBrowser(appUrl);
  });
}
