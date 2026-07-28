# Free AI Video Tools (researched for this project)

Goal: make automated kids videos look closer to a bright animal cartoon series — **for free**.

## What we use in the bot (default)

| Step | Tool | Cost | Why |
|------|------|------|-----|
| Scene images | [Pollinations](https://pollinations.ai) (`image.pollinations.ai`) | Free, no card | Cute cartoon animals with short prompts |
| Motion | FFmpeg Ken Burns zoom/pan + captions | Free | Turns stills into smooth scene clips |
| Optional AI video | Pollinations video (`wan` / `ltx-2`) | Free **Pollen** grants | Real motion when you add an API key |
| Fallback | Three.js + Playwright | Free | Local 3D if AI image API is down |
| Narration | Edge TTS | Free | Kids voiceover |
| Upload | YouTube Data API | Free quota | Daily posting |

Set in `.env`:

```
VISUAL_ENGINE=ai
# Optional for real AI video clips:
POLLINATIONS_API_KEY=your_key_from_enter.pollinations.ai
```

Get a free Pollinations key (no credit card): https://enter.pollinations.ai

---

## Other free / freemium tools researched

| Tool | Free tier | Automate? | Notes for kids series |
|------|-----------|-----------|------------------------|
| **Kling AI** | ~66 credits/day on web | Hard (no free API) | Good motion; watermark on free |
| **Hailuo (MiniMax)** | ~few clips/day on web | Hard | Strong quality; watermark |
| **Luma Dream Machine** | Limited monthly | Hard | Cinematic; watermark |
| **PixVerse** | Daily credits | Hard | Often **no watermark** on free |
| **Pika** | ~monthly credits | Hard | No watermark on some free plans |
| **Runway** | One-time trial credits | Paid API | Not sustainable free |
| **HappyHorse / Wan open-source** | Free if you run locally | Yes (GPU) | Needs strong PC / GPU |
| **Pollinations** | Free images + Pollen video | **Yes** | Best fit for this bot |

**Bottom line:** Web-only tools (Kling, Hailuo, Luma) look great but can’t power a reliable daily bot without paid APIs. Pollinations is the best **free + automatable** option we found.

---

## Quality tips (still free)

1. Keep `VISUAL_ENGINE=ai` (default).
2. Add `POLLINATIONS_API_KEY` for true AI video motion when you have Pollen.
3. Prefer animal stories (panda, bunny, duck…) — prompts are tuned for them.
4. Use `YOUTUBE_PRIVACY=unlisted` while testing uploads.
5. If AI images fail, the bot auto-falls back to local Three.js 3D.
