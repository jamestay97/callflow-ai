# Kids YouTube Studio

Create AI kids videos and upload them to **your YouTube channel** — with a simple visual app.

## Quick start

### 1. Install (one time)

```bash
cd kids-youtube-bot
npm install
npm approve-scripts sharp esbuild
npx playwright install chromium
```

Chromium is required for **3D video rendering** (Three.js + Playwright).

### 2. Launch the app

**Double-click:** `Start App.bat`

**Or from terminal:**

```bash
npm run app
```

Your browser opens to **http://localhost:3847**

---

## Connect your YouTube channel (in the app)

### Step 1 — Get YouTube API credentials (free, ~5 min)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project
3. **APIs & Services → Library** → enable **YouTube Data API v3**
4. **OAuth consent screen** → External → add your Gmail as a test user
5. **Credentials → Create OAuth Client ID → Desktop app**
6. Add redirect URI: `http://localhost:3000/oauth2callback`
7. Copy the **Client ID** and **Client Secret**

### Step 2 — In the app

1. Paste Client ID + Client Secret → **Save credentials**
2. Click **Connect YouTube Channel**
3. Sign in with the Google account that **owns your YouTube channel**
4. Allow upload access

You're connected when you see your channel name with a green dot.

### Step 3 — Upload videos

| Button | What it does |
|--------|--------------|
| **Create today's video** | AI generates script, animation, music → MP4 |
| **Upload to YouTube** | Uploads today's video to your channel |
| **Create + Upload** | Does both in one click |

Past videos appear in the list — click **Upload** on any that aren't on YouTube yet.

---

## Daily automation (optional)

Once connected, run full daily automation:

```bash
npm start
```

Creates and uploads a new video every day at 9 AM (change `CRON_SCHEDULE` in `.env`).

**Windows background task:**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-task.ps1
```

---

## All commands

| Command | Description |
|---------|-------------|
| `npm run app` | **Visual app** — connect channel + upload (recommended) |
| `npm run run` | Create + upload once (terminal) |
| `npm start` | Daily automatic create + upload |
| `npm run setup` | Check if YouTube is configured |
| `npm run status` | Show channel connection status |

---

## What's included

- **Lip-synced talking animal characters** — mouths follow the narration audio
- Bright AI kids-series backgrounds (Pollinations)
- Optional Pollinations text-to-video with free Pollen credits
- Background music on key scenes
- Free text-to-speech narration
- One-click YouTube upload (Made for Kids / COPPA)

Default: `VISUAL_ENGINE=talking`. See [FREE-AI-VIDEO.md](FREE-AI-VIDEO.md).

```bash
npx playwright install chromium
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Add YouTube API credentials" | Complete Step 1 in the app |
| Connect button fails | Check redirect URI is exactly `http://localhost:3000/oauth2callback` |
| Upload fails | Run `npm run status` — reconnect with Connect if needed |
| Port in use | Change `DASHBOARD_PORT` in `.env` |

Logs: `logs/automation.log`
