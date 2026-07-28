# Deploy CallFlow AI (live, no ngrok)

Deploy the **API** on [Railway](https://railway.app) and the **dashboard** on [Vercel](https://vercel.com). Both have free tiers to get started.

After deploy:
- **Dashboard:** `https://your-app.vercel.app`
- **Vapi webhook:** `https://your-api.railway.app/webhook/demo/voice`
- No ngrok needed — URLs stay the same.

---

## What you need

1. [GitHub](https://github.com) account (install [Git for Windows](https://git-scm.com/download/win) first)
2. [Railway](https://railway.app) account
3. [Vercel](https://vercel.com) account
4. Your Cal.com, Stripe, and Vapi keys (already set up in the dashboard)

---

## Step 1 — Push code to GitHub

In PowerShell:

```powershell
cd C:\Users\james\ai-receptionist
git init
git add .
git commit -m "Initial CallFlow AI deploy"
```

Create a new repo on GitHub (e.g. `callflow-ai`), then:

```powershell
git remote add origin https://github.com/YOUR-USERNAME/callflow-ai.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Deploy the API (Railway)

1. Go to [railway.app/new](https://railway.app/new)
2. **Deploy from GitHub repo** → select your repo
3. Railway detects the `Dockerfile` automatically
4. Open the service → **Variables** → add:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `PUBLIC_BASE_URL` | `https://YOUR-SERVICE.railway.app` (see below) |
| `WEB_APP_URL` | `https://YOUR-APP.vercel.app` (add after Step 3) |
| `ADMIN_API_KEY` | Generate a long random string (see below) |
| `VAPI_WEBHOOK_SECRET` | Same secret you use in Vapi |
| `TRUST_PROXY` | `true` |
| `CORS_ORIGINS` | `https://YOUR-APP.vercel.app` (add after Step 3) |
| `TENANT_DATA_PATH` | `/app/data/tenants.json` |
| `BOOKINGS_DATA_PATH` | `/app/data/bookings.json` |

5. **Settings → Networking → Generate domain** → copy the URL (e.g. `https://callflow-api-production.up.railway.app`)
6. Set `PUBLIC_BASE_URL` to that exact URL (no trailing slash)
7. **Settings → Volumes → Add volume** → mount path: `/app/data` (keeps tenants & bookings across redeploys)

Generate an admin key in PowerShell:

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```

8. **Deploy** → wait until healthy
9. Test: open `https://YOUR-SERVICE.railway.app/health` — should return JSON

---

## Step 3 — Deploy the dashboard (Vercel)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. **Root Directory:** click Edit → set to `web`
4. **Environment variables:**

| Variable | Value |
|----------|--------|
| `API_URL` | `https://YOUR-SERVICE.railway.app` |

5. Deploy
6. Copy your Vercel URL (e.g. `https://callflow-ai.vercel.app`)

---

## Step 4 — Link dashboard ↔ API

Back in **Railway**, update:

| Variable | Value |
|----------|--------|
| `WEB_APP_URL` | `https://YOUR-APP.vercel.app` |
| `CORS_ORIGINS` | `https://YOUR-APP.vercel.app` |

Redeploy Railway (or it may auto-redeploy).

---

## Step 5 — Configure per-client integrations

1. Open `https://YOUR-APP.vercel.app/dashboard`
2. Paste your `ADMIN_API_KEY` in the header
3. Open **demo** → **Integrations** → add Cal.com, Stripe, Vapi secret
4. Open **Vapi Setup** — Server URL should now show:
   ```
   https://YOUR-SERVICE.railway.app/webhook/demo/voice
   ```

---

## Step 6 — Update Vapi

In your Vapi assistant:

| Field | Value |
|-------|--------|
| **Server URL** | `https://YOUR-SERVICE.railway.app/webhook/demo/voice` |
| **Server URL Secret** | Same as `VAPI_WEBHOOK_SECRET` in Railway |

Enable **Server Messages:** `tool-calls`, `end-of-call-report`

Remove any `/health` URL — use `/webhook/demo/voice` only.

---

## Step 7 — Test live

1. Vapi → **Talk** → book an appointment
2. Check `https://YOUR-APP.vercel.app/dashboard/demo/bookings`
3. Check Railway logs for `vapi tool-calls`

---

## Quick reference

| What | URL |
|------|-----|
| Marketing + dashboard | `https://YOUR-APP.vercel.app` |
| Admin dashboard | `https://YOUR-APP.vercel.app/dashboard` |
| API health | `https://YOUR-SERVICE.railway.app/health` |
| Vapi webhook | `https://YOUR-SERVICE.railway.app/webhook/demo/voice` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **502 Bad Gateway** on `/health` | Open Railway **Deploy logs** — app likely crashed on startup. Do **not** set `PORT` manually; let Railway inject it. Redeploy after pulling latest code (fixes volume permissions). |
| Dashboard shows "API failed to respond" | Railway API must be up first. On Vercel set `API_URL` to your Railway URL (no trailing slash), then **Redeploy**. |
| Dashboard can't load clients | Set `API_URL` on Vercel; paste `ADMIN_API_KEY` in dashboard header |
| Vapi 404 on tools | Server URL must end with `/webhook/demo/voice` |
| Bookings disappear after redeploy | Add Railway volume at `/app/data` |
| 401 on admin routes | Paste `ADMIN_API_KEY` in dashboard header |
| Env validation fails on Railway | Set `NODE_ENV=production`, `PUBLIC_BASE_URL` (full `https://...`), `ADMIN_API_KEY`, `VAPI_WEBHOOK_SECRET`. `WEB_APP_URL` must include `https://`. |

---

## Cost

- **Railway:** ~$5/mo after free trial (API + volume)
- **Vercel:** Free for hobby dashboard
- **Vapi / Cal.com / Stripe:** their own free tiers for testing

---

## Local dev (unchanged)

```powershell
npm run dev:all
```

Dashboard: http://localhost:3000  
API: http://localhost:3001
