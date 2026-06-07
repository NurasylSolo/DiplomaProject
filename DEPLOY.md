# Deploying Senti News to `sentinews.online`

End-to-end guide to put the full app online: **Next.js frontend on Vercel**,
**FastAPI backend + PostgreSQL on Render**, domain **`sentinews.online`**.

```
                 sentinews.online ─────────────► Vercel (Next.js frontend)
                                                       │  calls
 api.sentinews.online ─────────────► Render (FastAPI) ─┴─► Render PostgreSQL
                                          │
                                          └─► OpenAI + news APIs (server-side)
```

Why this split: the backend runs **long background ingestion (2–5 min per
project)**, so it must live on an **always-on** host (Render/Railway/VPS) —
never on serverless functions, which time out.

---

## 0. Prerequisites
- The code pushed to a **GitHub repository**.
- Accounts: [Render](https://render.com), [Vercel](https://vercel.com),
  and your domain registrar account (where you bought `sentinews.online`).
- Your API keys ready: OpenAI, NewsAPI, SerpAPI, NewsData, Event Registry,
  World News, Google OAuth client, and an SMTP user/password (e.g. a Gmail
  app password).

> Never commit real secrets. `.env` is git-ignored; templates are
> `backend/.env.example` and `frontend/.env.example`.

---

## 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

---

## 2. Backend + database on Render (one Blueprint)
1. Render dashboard → **New +** → **Blueprint**.
2. Connect the GitHub repo. Render detects [`render.yaml`](render.yaml) and
   shows two resources: **sentinews-db** (PostgreSQL) and **sentinews-api**
   (Docker web service).
3. Click **Apply**. Render will prompt for the secret env vars marked
   `sync: false` — paste each:
   - `OPENAI_API_KEY`, `NEWS_API_KEY`, `SERP_API_KEY`, `NEWSDATA_API_KEY`,
     `EVENT_REGISTRY_API_KEY`, `WORLD_NEWS_API_KEY`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `SMTP_USER`, `SMTP_PASSWORD`
4. Render builds the Docker image, runs `alembic upgrade head` automatically
   on start (creates all tables), then launches uvicorn. Wait for **Live**.
5. Note the service URL, e.g. `https://sentinews-api.onrender.com`. Verify:
   open `https://sentinews-api.onrender.com/health` → `{"status":"ok"}`.

`DATABASE_URL`, `SECRET_KEY` and `CORS_ORIGINS` are configured automatically
by the blueprint. The app normalizes the DB URL scheme for asyncpg, so
Render's connection string works as-is.

---

## 3. Frontend on Vercel
1. Vercel → **Add New** → **Project** → import the same GitHub repo.
2. **Root Directory:** `frontend`. Framework preset: **Next.js** (auto).
3. **Environment Variables** (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_API_URL = https://api.sentinews.online/api/v1`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID = <your Google client id>`
   (You can temporarily use the raw Render URL until DNS is set:
   `https://sentinews-api.onrender.com/api/v1`.)
4. **Deploy.** Vercel gives a `*.vercel.app` URL; confirm the site loads.

---

## 4. Point the domain `sentinews.online`
At your registrar's DNS settings (or move DNS to Cloudflare — free, faster):

**Frontend (apex + www) → Vercel.** In Vercel → Project → Settings →
Domains, add `sentinews.online` and `www.sentinews.online`, then add the
records Vercel shows, typically:
- `A`  `@`  → `76.76.21.21`
- `CNAME` `www` → `cname.vercel-dns.com`

**Backend subdomain → Render.** In Render → service → Settings → Custom
Domains, add `api.sentinews.online`, then add the record Render shows:
- `CNAME` `api` → `sentinews-api.onrender.com`

DNS can take minutes to a few hours. TLS/HTTPS certificates are issued
automatically by both Vercel and Render — **do not buy an SSL add-on.**

After `api.sentinews.online` is live, make sure Vercel's
`NEXT_PUBLIC_API_URL` = `https://api.sentinews.online/api/v1` and redeploy
the frontend (env changes need a rebuild).

---

## 5. Google OAuth (for "Sign in with Google")
In Google Cloud Console → Credentials → your OAuth client:
- **Authorized JavaScript origins:** `https://sentinews.online`
- **Authorized redirect URIs:** `https://sentinews.online` (and any others
  the login flow uses).

---

## 6. Final verification
1. Open `https://sentinews.online` → frontend loads over HTTPS.
2. Register / log in → no CORS errors in browser DevTools → Network.
3. Create a project → live progress (current source + growing counters) →
   mentions, charts, AI insights and the assistant work.

---

## Local development (recap)
Backend:
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env        # fill in values; DATABASE_URL -> local Postgres
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Frontend:
```bash
cd frontend
npm install
# .env.local with NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev
```

---

## Alternative: single VPS with Docker
On a $5–6/mo VPS (Hetzner/DigitalOcean):
1. Install Docker + Docker Compose.
2. Run a Postgres container, set `DATABASE_URL` to it.
3. Build & run the backend: `docker build -t sentinews-api ./backend && docker run -p 8000:8000 --env-file backend/.env sentinews-api` (it runs migrations + uvicorn).
4. Build the frontend (`npm run build` / `npm start`) or also containerize it.
5. Put **Caddy** or **Nginx** in front for HTTPS (Caddy auto-issues Let's
   Encrypt certs) and route `sentinews.online` → frontend, `api.` → backend.

---

## Cost & operational notes
- **Domain** ~$1/mo · **Vercel** free · **Render web (starter)** ~$7/mo ·
  **Render Postgres** free 90 days (then ~$7/mo) · **OpenAI** usage-based.
- **Cap OpenAI spend:** set a hard monthly limit in the OpenAI dashboard —
  on a public site every visitor spends your tokens.
- **Free news-API tiers have daily limits**; fine for a demo, upgrade for
  real traffic.
- `SCHEDULER_ENABLED=false` keeps things calm on a single instance. Turn it
  on only if you want automatic periodic refresh of all projects.
- Jobs orphaned by a restart are auto-marked failed on startup, so the UI
  never spins forever.
