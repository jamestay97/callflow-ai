# Test Launch Guide

Use this checklist to verify the test build before going live.

## Launch (one command)

**Double-click:** `Start App.bat`

**Or:**

```bash
cd kids-youtube-bot
npm run test:launch
```

Opens **http://localhost:3847** with a sample video ready to preview.

---

## Test checklist

| # | Test | Expected |
|---|------|----------|
| 1 | App opens in browser | Dashboard loads with "Test mode" banner |
| 2 | Test checklist shows green checks | App configured, output folder ready |
| 3 | Sample video exists | "Sample video created" is checked |
| 4 | Click **Preview** on a video | Video plays in the preview player |
| 5 | Click **Create today's video** | New video generates (~1–2 min), appears in list |
| 6 | Save YouTube credentials | Step 1 saves without error |
| 7 | **Connect YouTube Channel** | Google sign-in opens, channel name appears |
| 8 | Click **Upload to YouTube** | Video publishes to your channel (use `unlisted` for testing) |

---

## Recommended test settings

In the app, set **Video privacy** to **Unlisted** for first uploads so only people with the link can view.

---

## Commands

```bash
npm run test:launch    # Sample video + open app (full test launch)
npm run test:prepare   # Generate sample video only
npm run app            # Open app without generating video
npm run status         # Terminal status check
```

Force regenerate sample video:

```bash
npm run test:prepare -- --force
```

---

## What's included in test build

- Visual dashboard at localhost:3847
- In-browser video preview
- Test mode banner + checklist
- Sample AI video (animated characters + music)
- YouTube connect + upload (when credentials added)

---

## Known test limitations

- YouTube upload requires Google Cloud OAuth credentials (free)
- Gemini AI scripts may fall back to templates if API quota exceeded
- App runs locally only (localhost) — not deployed to the internet yet
