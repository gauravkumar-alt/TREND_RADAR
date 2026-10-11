# TREND//RADAR

> **Know what's about to trend.** See the conversations forming before they become obvious.

TREND//RADAR is a pattern-level YouTube intelligence publication for one creator. Every week it reads live YouTube data for the creator's categories and region, groups the videos into **3–5 topic clusters** with Gemini Flash, and scores each cluster with calculated signals. It then writes a **Sunday Brief** that answers two questions: *what should I make this week?* and *why now?*

Built for the MESA C4 "AI and its Applications" final exam, Problem Statement 13: *YouTube Trend Radar*.

---

## The problem

Ishaan runs an Indian tech channel (AI tools, productivity apps, tech reviews) and posts three videos a week. His hits are the videos that caught a wave at the right moment: a Cursor IDE video got 40,000 views in three days, while a review published two months after its topic peaked got 600. Every Sunday he spends about 90 minutes browsing trending pages. That shows him individual videos but not the pattern across fifty of them: which topics are clustering, which formats are winning, how long the videos run, and whether a topic is rising or cooling.

## The solution

| Question | Where it's answered | How |
|---|---|---|
| What is happening? | `/radar` → live video reel | YouTube `search.list` + `videos.list` + the region's Science & Tech trending chart |
| What pattern is forming? | `/radar` → Trend Formation, `/trends` | Gemini Flash clusters a compact, pre-calculated table of up to 90 videos |
| Is it rising? | Momentum section | Upload timing across the window (observed) + view velocity between stored snapshots |
| Why does it matter? | Why Now | Gemini interpretation, shown next to calculated evidence |
| What should I make? | What I Would Make, Monday Morning | Gemini recommendation + calculated length and confidence |

Every insight carries exactly one label: **OBSERVED** (from the YouTube API), **CALCULATED** (by the app), **AI INTERPRETATION** (Gemini) or **RECOMMENDATION**.

## Product walkthrough

1. **`/radar`: Live Radar.** A cinematic scroll story built with GSAP ScrollTrigger:
   - Hero with live scan stats and a radar plot of real videos (angle = cluster, distance = age, size = views/hour). This week's 3–4 topics orbit the radar as keyword + trend-score chips; the orbit pauses on hover/focus, and each chip opens that topic on `/trends`.
   - A pinned statement: *"The internet doesn't trend one video at a time."* turns into *"It trends in conversations."*
   - **ScrollVideoReel**: five real videos rotate as you scroll (pin + scrub + snap, clip-path reveals). Each one links to `youtube.com/watch?v=…`.
   - *"But the video isn't the story. The pattern is."*
   - **TrendFormation**: the top cluster's thumbnails converge into the topic name, and then its calculated stats count up.
   - **Momentum**: the uploads-per-day line draws itself, then the verdict appears: RISING / STABLE / COOLING / BUILDING BASELINE.
   - **Why Now**, then **"So what should Ishaan make?"**
2. **`/trends`: Trend Intelligence.** Opens with an at-a-glance row of every topic (keyword, score, momentum) and a one-line key to the four labels. Each topic shows its key numbers and *what to make* straight away; *Show details* reveals why now, what viewers care about, the full recommendation, example videos, who's covering it, formats that work, momentum and how the score is built. Filter by momentum, or open *New scan* to rescan with another region, look-back or category. Previous scans can be reopened.
3. **`/brief`: Sunday Brief.** An editorial report with *The One To Watch*, the 3–5 opportunities, and a *Monday Morning* filming plan (film this, format, angle, title, why). If Resend is configured, the brief can also be emailed.
4. **Light / dark mode.** A toggle in the nav switches themes; the choice is remembered and applied before first paint.
5. **`/settings`.** Categories (presets plus custom keyword categories), region, language, lookback window, videos per category, and email. Settings are stored in Supabase.

## Architecture

```
YouTube Data API v3 ─┐
                     ▼
               Data layer (lib/youtube)  ── dedupe · cache · batch · quota meter
                     ▼
               Supabase (videos, video_snapshots)
                     ▼
               Signal engine (lib/trends)  ── engagement · velocity · recency · normalisation
                     ▼
               Gemini Flash (lib/gemini)   ── clusters · formats · why-now · angles · titles
                     ▼
               Validation (Zod + grounding checks, 1 retry)
                     ▼
               Scoring + metrics (lib/trends/scoring.ts, metrics.ts)
                     ▼
               trend_runs / trend_clusters / cluster_videos
                     ▼
        /radar  ·  /trends  ·  /brief  (+ optional Resend email)
```

The whole pipeline lives in `src/lib/pipeline/runRadar.ts`. `/api/radar/run` streams real progress events as NDJSON, and the loading screen shows the stage the server is actually on: COLLECTING SIGNALS → ANALYZING CREATOR COVERAGE → IDENTIFYING PATTERNS → CALCULATING MOMENTUM → GENERATING BRIEF.

See **[COMPONENTS_MAP.md](COMPONENTS_MAP.md)** for every page, component, API route and data flow, with Mermaid diagrams.

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui primitives (`components.json`, `components/ui/button`) · GSAP 3 + ScrollTrigger + `@gsap/react` · Lucide · Zod · date-fns · YouTube Data API v3 · Gemini API (Flash only) · Supabase Postgres · Vercel (hosting + Cron) · Resend (optional) · Vitest.

All services used have free tiers. The app makes no Claude API, OpenAI API, paid scraping or paid analytics calls.

## YouTube API

| Call | Cost | Used for |
|---|---|---|
| `search.list` (`type=video`, `regionCode`, `relevanceLanguage`, `publishedAfter`) | 100 units | Finding recent uploads per category keyword. Only IDs are kept. |
| `videos.list` (`part=snippet,contentDetails,statistics`, 50 ids per call) | 1 unit | Title, description, channel, publish date, thumbnail, duration, views, likes, comments, category |
| `videos.list` (`chart=mostPopular`, `videoCategoryId=28`) | 1 unit | The region's Science & Tech trending chart |

**Quota management.** A scan makes at most 8 searches (about 800–810 units of the free 10,000/day). Other measures:

- ids are deduplicated before `videos.list`, and `videos.list` is batched 50 ids at a time;
- searches are cached in-process for 15 minutes;
- a scan with identical settings run within 20 minutes reuses the stored run (*Run radar* on the hero forces a fresh scan);
- the daily snapshot cron uses only `videos.list` (1 unit per 50 videos).

Hidden likes and disabled comments are stored as `null`, never `0`.

## Gemini Flash

- **Only Flash models are allowed.** `GEMINI_MODEL` defaults to `gemini-flash-latest`, and `lib/gemini/client.ts` refuses any model name without "flash" in it.
- **Input** is a compact pipe-separated table rather than raw API JSON. Each row has a short ref (`v1…v90`), title, channel, age, duration, views, likes, comments, views per hour, engagement %, category and a cleaned 160-character description.
- **Output** is JSON mode with a `responseSchema`: `clusters[] { name, summary, videoRefs[], formats[{ref, format}], whyNow, momentumNarrative, audienceSignals[], recommendation { shouldCover, reason, angle, possibleTitle, format } }`.
- **Validation** (`lib/gemini/schemas.ts`):
  - the output is checked with a Zod schema;
  - refs Gemini was not given are discarded;
  - a video can belong to only one cluster;
  - each cluster needs at least 2 videos from at least 2 channels;
  - there must be 3–5 clusters.

  If validation fails, the problems are sent back to Gemini for **one retry**. If the retry also fails, the run fails with a clear `GEMINI_INVALID` message and nothing is saved.
- **Numbers never come from Gemini.** Views, likes, comments, creator counts, video counts, format percentages, trend scores, momentum and growth are all computed in TypeScript. Gemini only labels each video's format; the app counts the shares.
- **The brief** is a second Flash call that receives the clusters plus their calculated metrics. Its prompt says to quote only numbers that appear in that data, and the response is validated the same way.

## Trend scoring (`src/lib/trends/scoring.ts`)

| Factor | Weight | Raw input |
|---|---|---|
| Topic frequency | 25% | videos in the cluster |
| Momentum | 20% | mean view velocity (snapshot-measured when available, otherwise lifetime views/hour), log-scaled, blended 70/30 with coverage growth |
| Creator diversity | 15% | `unique × √(unique / videos)`, which rewards many creators over one prolific channel |
| Engagement | 15% | mean `(likes + comments) / views` |
| Recency | 15% | mean `1 − age / lookback` |
| Format momentum | 10% | median velocity of the leading format ÷ cluster median velocity |

Inputs are min-max normalised across the clusters in the same scan (view velocity on a log scale). Recency and format lift use absolute scales. A missing factor scores 0, so incomplete data can lower a score but never inflate it. The result is an integer from 0 to 100. The *Score anatomy* panel on `/trends` shows each factor's contribution.

**Momentum label** (`lib/trends/metrics.ts`) combines two signals:

- *coverage growth*: uploads in the newer half of the lookback window vs the older half (observed publish dates, needs at least 4 videos);
- *velocity ratio*: snapshot views/hour ÷ lifetime views/hour (needs at least 2 videos with 2 or more snapshots).

When neither is available, the label is **BUILDING BASELINE**. History is never invented.

## Database (Supabase Postgres)

`supabase/schema.sql` creates these tables, with foreign keys, unique constraints and indexes; RLS is enabled and only the service role can access them:

| Table | Purpose |
|---|---|
| `user_settings` | The creator's configuration (single row `default`) |
| `videos` | The latest metadata for each YouTube video |
| `video_snapshots` | Views, likes and comments at each observation time (`unique(video_id, captured_at)`). This is the source of all growth figures. |
| `trend_runs` | Each scan: status, settings, quota used, model, error, and the full computed payload |
| `trend_clusters` | The clusters for each run (`unique(run_id, rank)`): calculated metrics, score breakdown, formats and AI fields |
| `cluster_videos` | Cluster ↔ video membership, with the AI format label |
| `briefs` | One Sunday Brief per run (`unique(run_id)`) |
| `brief_deliveries` | Email delivery attempts and their outcomes |

## Cron

`vercel.json` defines two jobs:

| Path | Schedule (UTC) | What it does |
|---|---|---|
| `/api/cron/snapshots` | `30 0 * * *` (06:00 IST daily) | Re-observes tracked videos from the last 14 days. This is what turns BUILDING BASELINE into measured velocity. |
| `/api/cron/sunday` | `30 2 * * 0` (08:00 IST Sunday) | Runs the full Sunday workflow: settings → YouTube → snapshots → signals → Gemini clusters → validation → store → brief → optional email |

Both jobs require `Authorization: Bearer $CRON_SECRET`, which Vercel sends automatically. The Sunday job also checks server-side that it is Sunday before noon IST, so a mis-fired schedule cannot run mid-week. To test it manually, add `?force=1`. Vercel Hobby crons can fire anywhere within their scheduled hour, so the brief lands by about 09:00 IST, well before noon.

## Environment variables

See [`.env.example`](.env.example).

| Variable | Required | Notes |
|---|---|---|
| `YOUTUBE_API_KEY` | yes | YouTube Data API v3 |
| `GEMINI_API_KEY` | yes | Google AI Studio |
| `GEMINI_MODEL` | no | Default `gemini-flash-latest`; must contain "flash" |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | yes for history | Without them the radar still runs, but nothing is saved |
| `CRON_SECRET` | yes on Vercel | Authenticates the cron routes |
| `RESEND_API_KEY`, `BRIEF_FROM_EMAIL` | no | Email delivery |
| `APP_URL` | no | Links in emails |

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in the keys
# Supabase → SQL editor → paste and run supabase/schema.sql
npm run dev                  # http://localhost:3300
```

Checks:

```bash
npm test          # vitest: scoring, engagement, velocity, normalisation, settings, Gemini validation, API failures, cluster prep
npm run lint
npm run build
```

Trigger the Sunday job locally:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3300/api/cron/sunday?force=1"
```

## Deployment (Vercel)

1. Push to GitHub and import the repository in Vercel. The framework (Next.js) is detected automatically.
2. Add the environment variables above, including `CRON_SECRET`, to Production.
3. Deploy. The cron jobs in `vercel.json` register automatically.
4. Open `/settings`, confirm that all services show as connected, then run the radar once from `/radar`.

`/api/radar/run` and `/api/cron/sunday` declare `maxDuration = 300`. A full scan usually takes 30–90 seconds, mostly waiting on Gemini.

## Known limitations

- **Search bias.** `search.list` returns what YouTube considers relevant for each keyword, not a random sample. Clusters reflect the keywords set in Settings, so add custom categories to widen coverage.
- **Velocity needs time.** On the first scan, view momentum is the lifetime average and the history panel shows BUILDING BASELINE. Measured velocity appears once the daily snapshot cron has run at least once for those videos.
- **Coverage growth** compares upload counts in the two halves of the window, so it is coarse for thin clusters (it is hidden below 4 videos).
- **Shorts** (under 2 minutes, or titled #shorts) are excluded because the channel is long-form.
- **AI interpretation is labelled as such.** Gemini's "why now" is grounded in titles and descriptions, not in outside news, and it can be wrong. The calculated evidence sits beside it so the reader can judge.
- **Single creator, no authentication.** The app assumes one creator. API routes that spend quota are open on the public URL; quota is protected by the run-reuse window and per-instance caching. Add an auth layer before sharing the app widely.
- **Email** with Resend's `onboarding@resend.dev` sender only delivers to the Resend account owner until a domain is verified.
