# CallFlow AI — Multi-Tenant Booking Receptionist

Platform for selling AI phone receptionists to local businesses. Includes a **marketing site + admin dashboard** and a **multi-tenant API** that powers voice AI booking, intent matching, and Stripe payments.

## Quick start

```powershell
cd C:\Users\james\ai-receptionist
copy .env.example .env
npm install
cd web; npm install; cd ..

# One command starts both API + dashboard
npm run dev:all
```

Or use the helper script (kills stuck ports first):

```powershell
.\start.ps1
```

- **Dashboard:** http://localhost:3000/dashboard
- **Marketing site:** http://localhost:3000
- **API:** http://localhost:3001

Paste your `ADMIN_API_KEY` from `.env` into the dashboard header to manage clients.

On first run, a **demo** tenant is seeded from your `.env` business vars (slug: `demo`).

**Deploy live (no ngrok):** see [DEPLOY.md](./DEPLOY.md) — Railway (API) + Vercel (dashboard).

---

## Architecture

```
Marketing site + Dashboard (Next.js :3001)
    │
    ▼
/admin/tenants          ← Create & manage business profiles
    │
    ├── AI Skills       ← Match caller intent → service → booking
    ├── /webhook/{slug}/voice     ← Vapi Server URL (per business)
    ├── /api/{slug}/tools/*       ← Direct tool testing
    ├── data/tenants.json         ← Tenant store
    └── data/bookings.json        ← Bookings from AI calls
```

### Voice AI workflow

1. **`match_call_intent`** — Matches caller reason to a configured skill
2. **`check_calendar_availability`** — Pulls real slots from Cal.com
3. **`book_appointment`** — Books and saves to your dashboard
4. **`send_payment_link`** — Stripe link via Make.com SMS automation

Each tenant has its own:
- Business knowledge (hours, services, FAQs, policies)
- Cal.com calendar credentials
- Stripe account for payment links
- Make.com webhook for SMS/email automations
- Optional Vapi webhook secret

---

## Admin API (manage your clients)

All routes under `/admin` require `x-admin-key` header in production.

### List all businesses

```powershell
curl http://localhost:3000/admin/tenants
```

### Create a new client

```powershell
curl -X POST http://localhost:3000/admin/tenants `
  -H "Content-Type: application/json" `
  -d "{
    \"slug\": \"joes-plumbing\",
    \"displayName\": \"Joe's Plumbing\",
    \"businessPhone\": \"+15559876543\",
    \"timezone\": \"America/New_York\",
    \"services\": [
      {\"id\":\"drain-clean\",\"name\":\"Drain Cleaning\",\"description\":\"Clear clogged drains\",\"durationMinutes\":60,\"priceUsd\":129}
    ],
    \"integrations\": {
      \"calcomApiKey\": \"cal_live_...\",
      \"calcomEventTypeId\": 123456,
      \"stripeSecretKey\": \"sk_test_...\",
      \"makeWebhookUrl\": \"https://hook.us1.make.com/...\"
    }
  }"
```

### Update a client

```powershell
curl -X PATCH http://localhost:3000/admin/tenants/joes-plumbing `
  -H "Content-Type: application/json" `
  -d "{\"status\":\"active\",\"promptAppend\":\"Mention our 24/7 emergency line for urgent leaks.\"}"
```

### Get onboarding package (URLs + checklist)

```powershell
curl http://localhost:3000/admin/tenants/joes-plumbing/onboarding
```

Returns Vapi server URL, system prompt, tools, and setup checklist.

### Get system prompt for Vapi

```powershell
curl http://localhost:3000/admin/tenants/joes-plumbing/prompt
```

---

## Per-client Vapi setup

Each business gets a unique webhook URL:

```
https://your-domain.com/webhook/joes-plumbing/voice
```

1. Create Vapi assistant for the client
2. Paste system prompt from `/admin/tenants/{slug}/prompt`
3. Add tools from `/admin/tenants/{slug}/tools/schemas`
4. Set Server URL to `/webhook/{slug}/voice`
5. Set Server URL Secret to the client's `vapiWebhookSecret` (or platform default)

---

## Make.com automations

Each tenant can have its own Make.com webhook. Filter scenarios on `event`:

| Event | Use for |
|-------|---------|
| `payment.link.created` | Twilio SMS with Stripe payment link |
| `call.ended` | SendGrid email with call summary |

Payload includes `tenant.slug` so one Make account can route by business.

---

## Production

```env
NODE_ENV=production
PUBLIC_BASE_URL=https://api.yourdomain.com
ADMIN_API_KEY=<64-char-random-hex>
TRUST_PROXY=true
TENANT_DATA_PATH=./data/tenants.json
```

Deploy with Docker:

```powershell
docker compose up --build -d
```

Mount `./data` as a volume for persistent tenant storage.

### Scaling path

| Stage | Storage | Notes |
|-------|---------|-------|
| Now | JSON file | Zero deps, works on Windows |
| 10–50 clients | PostgreSQL | Swap `tenantStore` for DB |
| 50+ clients | Postgres + Redis | Session state, rate limits |

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness + tenant count |
| GET | `/ready` | Platform readiness |
| GET | `/admin/tenants` | List all businesses |
| POST | `/admin/tenants` | Create business |
| PATCH | `/admin/tenants/:slug` | Update business |
| DELETE | `/admin/tenants/:slug` | Remove business |
| GET | `/admin/tenants/:slug/onboarding` | Setup package |
| GET | `/admin/tenants/:slug/prompt` | AI system prompt |
| POST | `/webhook/:slug/voice` | Vapi server URL |
| POST | `/webhook/:slug/call-ended` | Call summary webhook |
| POST | `/api/:slug/tools/*` | Direct tool testing |
