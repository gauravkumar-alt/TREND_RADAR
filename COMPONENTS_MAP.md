# TREND//RADAR — Components Map

This map shows how each page is assembled: its components, where their data comes from, which API route serves it, and where AI and animation are involved.

Provenance key used throughout the UI: **OBSERVED** (YouTube API), **CALCULATED** (TypeScript), **AI INTERPRETATION** (Gemini Flash), **RECOMMENDATION** (Gemini Flash, combined with calculated length and confidence).

---

## 1. System architecture

```mermaid
flowchart TD
    YT[YouTube Data API v3<br/>search.list · videos.list · mostPopular chart] --> DL
    subgraph DL[Data layer · lib/youtube]
      C1[dedupe · 15-min cache · 50-id batching · QuotaMeter]
    end
    DL --> SB[(Supabase<br/>videos · video_snapshots)]
    SB --> SE
    DL --> SE
    subgraph SE[Signal engine · lib/trends]
      S1[signals.ts<br/>engagement · views/h · snapshot velocity]
      S2[prepare.ts<br/>drop Shorts · cap per channel · compact table]
    end
    SE --> GM[Gemini Flash · lib/gemini<br/>clusters · formats · why now · angles · titles]
    GM --> VAL[Validation<br/>Zod + grounding checks + 1 retry]
    VAL --> TI
    subgraph TI[Trend intelligence]
      M1[metrics.ts<br/>coverage growth · momentum label · creators · formats · length · confidence]
      M2[scoring.ts<br/>6 weighted factors → 0–100]
    end
    TI --> DB[(Supabase<br/>trend_runs · trend_clusters · cluster_videos)]
    DB --> RADAR[/radar · Live Radar/]
    DB --> TRENDS[/trends · Trend Intelligence/]
    DB --> BR[Gemini Flash · brief copy] --> BRIEFS[(briefs)] --> BRIEF[/brief · Sunday Brief/]
    BRIEFS --> EMAIL[Resend · optional] --> DEL[(brief_deliveries)]
```

## 2. Sunday automation

```mermaid
sequenceDiagram
    participant Cron as Vercel Cron (Sun 02:30 UTC)
    participant API as /api/cron/sunday
    participant YT as YouTube API
    participant DB as Supabase
    participant G as Gemini Flash
    participant R as Resend
    Cron->>API: GET (Bearer CRON_SECRET)
    API->>API: Is it Sunday before noon IST? (else skip)
    API->>DB: load user_settings
    API->>YT: search.list × ≤8, videos.list (batched), mostPopular
    API->>DB: upsert videos, read + insert snapshots
    API->>API: compute signals, prepare ≤90 rows
    API->>G: cluster (JSON schema)
    G-->>API: clusters
    API->>API: validate (retry once) → metrics → score → rank
    API->>DB: trend_runs + trend_clusters + cluster_videos
    API->>G: write brief
    API->>DB: briefs
    opt email enabled + RESEND_API_KEY
      API->>R: send brief
      API->>DB: brief_deliveries
    end
```

Daily, separately: `/api/cron/snapshots` → `videos.list` for tracked videos → `video_snapshots`.

## 3. Manual run (streamed)

```mermaid
sequenceDiagram
    participant U as RunRadarButton
    participant P as RadarProvider
    participant API as POST /api/radar/run
    participant L as LoadingRadar
    U->>P: startRun(overrides)
    P->>API: fetch (NDJSON stream)
    API-->>P: {type:"stage", stage:"COLLECTING SIGNALS"}
    P-->>L: stage → highlight step
    API-->>P: … ANALYZING CREATOR COVERAGE · IDENTIFYING PATTERNS · CALCULATING MOMENTUM · GENERATING BRIEF
    API-->>P: {type:"done", run, briefId}
    P->>P: router.refresh() — server pages re-read Supabase
```

---

## 4. Pages

### `/radar` — Live Radar (`app/radar/page.tsx`)

```mermaid
flowchart LR
    page[radar/page.tsx<br/>server: loadPageData] --> RE[RadarExperience]
    RE --> RH[RadarHero] --> RSF[RadarSignalField]
    RH --> TOB[TopicOrbit]
    RE --> SS[StatementSection]
    RE --> SVR[ScrollVideoReel] --> TV[TrendingVideo ×5]
    RE --> TR[TopicReveal]
    RE --> TF[TrendFormation]
    RE --> MS[MomentumSection] --> MC[MomentumChart]
    RE --> WN[WhyNowSection]
    RE --> RS[RecommendationSection]
```

| Component | Purpose | Data | API | AI | Animation (lib/animations/presets.ts) | State |
|---|---|---|---|---|---|---|
| `RadarExperience` | Orders the scroll story; picks the newest run (server or session) | `RadarRun` | `loadPageData` → Supabase | — | `ScrollTrigger.refresh` after mount | `useCurrentRun` (context) |
| `RadarHero` | Full-screen title, scope tags, last scan / videos analysed / active signals, CTAs, last-successful-scan banner | run, settings, failure | — | — | `heroIntro`: line mask → tagline → meta → dots → CTA last; grid drift | none |
| `TopicOrbit` | This week's 3–4 topics as keyword + trend-score chips orbiting the radar; pause on hover/focus; each opens `/trends#cN` | run.clusters (keyword from AI, score CALCULATED) | — | keyword | GSAP rotation timeline + counter-rotation, pop-in | none |
| `RadarSignalField` | SVG radar; each dot is a real video (angle = cluster, radius = age, size = views/h) | run.clusters, signals | — | cluster labels (AI names) | `radarAmbient`: sweep rotation, dot breathing | memoised layout |
| `StatementSection` | "Doesn't trend one video at a time" → "Trends in conversations" | static copy | — | — | `statementScene`: pin + scrub, word light-up, strike, clip-path reveal | none |
| `ScrollVideoReel` | Scroll-controlled reel of the 5 fastest videos | `reelVideoIds`, videos, signals (OBSERVED + CALCULATED views/h) | — | — | `reelScene`: pin, scrub, **snap to labels**, clip-path + scale + text displacement + meta stagger, progress bar | counter via ref (no re-render) |
| `TrendingVideo` | One stage/card: thumbnail, title, channel, views, likes, comments, duration, published, category, LIVE SIGNAL; links to YouTube | `Video` | — | — | targeted by `reelScene` via data-attributes | none |
| `TopicReveal` | "But the video isn't the story. The pattern is." | static | — | — | `topicRevealScene`: pin, scale-in | none |
| `TrendFormation` | **Signature**: cluster thumbnails converge into the topic; creators / videos / coverage / avg duration / score count up | top cluster + its videos | — | cluster name (AI) | `formationScene` + `countUp` | none |
| `MomentumSection` | "Is this trend rising?" uploads/day line, verdict, coverage, explainer | `momentumSeries` (OBSERVED), `metrics` (CALCULATED), `momentumNarrative` (AI) | — | narrative | `momentumScene`: stroke-dashoffset draw, area fade, verdict scale | none |
| `WhyNowSection` | Editorial why-now + evidence grid with provenance tags | cluster.ai.whyNow + metrics | — | whyNow | `steppedScene` (pinned) | none |
| `RecommendationSection` | "So what should Ishaan make?" title, angle, format, suggested length, confidence, CTA | cluster.ai.recommendation + calculated length/confidence | — | recommendation | `steppedScene` | none |

**Phones (<900px)** never pin (pinning fights touch scrolling and mobile toolbars). Each scene has a phone version instead: `reelMobile` (cards wipe up, titles rise), `statementMobile` and `topicRevealMobile` (scroll-scrubbed light-up and wipe), `formationMobile` (thumbnails converge as you scroll, then stats count up), `momentumMobile` (line draws, verdict lands) and `steppedMobile` (headings rise, blocks step in). With `prefers-reduced-motion`, no scene is built and the static layout is shown.

### `/trends` — Trend Intelligence (`app/trends/page.tsx`)

```mermaid
flowchart LR
    page[trends/page.tsx<br/>?run=id] --> TO[TrendOverview<br/>filters · history]
    TO --> TC[TrendCluster ×3–5]
    TO --> RAIL[Topic rail]
    TC --> SG[ScoreGauge]
    TC --> TM[TrendMetrics]
    TC --> CC[CreatorCoverage]
    TC --> FB[FormatBreakdown]
    TC --> MC[MomentumChart]
    TC --> SA[ScoreAnatomy]
    TC --> EV[EvidenceVideos]
    TC --> REC[TrendRecommendation]
```

| Component | Purpose | Data | API | AI | Animation | State |
|---|---|---|---|---|---|---|
| `TrendOverview` | Header, sticky filter bar (category, region, lookback, momentum), run new radar, previous scans; side rail of topics on wide screens | run, history, settings | `loadPageData`, `POST /api/radar/run` | — | `trendsIntro` (title letters rise via SplitText); `topicRail` (active topic highlighted, line fills as you read) | filter state (`useState`) |
| `TrendCluster` | Rank, name, summary, score ring, momentum, metrics; expandable intelligence panel | `TrendCluster` | — | name, summary, whyNow, audienceSignals, narrative | `topicScene`: rank drifts (parallax), title rises word by word, ring draws, numbers count up; `detailsOpen`: blocks stagger, bars grow, chart draws, thumbnails wipe in | `open` (`aria-expanded`) |
| `ScoreGauge` | Trend score as a ring | `score` (CALCULATED) | — | — | arc drawn with DrawSVG, number counts up | none |
| `TrendMetrics` / `MomentumBadge` | Score, creators, videos, avg views, avg duration, engagement | `metrics` (CALCULATED) | — | — | values count up from 0 to the real number (`countIn`) | none |
| `CreatorCoverage` | Real channel names with video count and views, linking to the channels | `creators` (OBSERVED) | — | — | — | none |
| `FormatBreakdown` | Horizontal bars; percentages only when ≥3 classified | `formats` (AI labels → CALCULATED shares) | — | per-video format label | bars grow (`growBars`) | none |
| `MomentumChart` / `ViewHistoryChart` | Uploads per day; indexed views across snapshots (only if history exists) | `momentumSeries`, `viewHistory` | — | — | line draws itself (DrawSVG) | none |
| `ScoreAnatomy` | Each factor × weight → score | `scoreBreakdown` | — | — | bars grow | none |
| `EvidenceVideos` | 3–5 videos: thumbnail, title, channel, views, duration, published, likes, comments | videos (OBSERVED) | — | format tag | thumbnails wipe in; hover scale | none |
| `TrendRecommendation` | What I would make · why now · possible title · format · suggested length · confidence | recommendation + calculated | — | recommendation | — | none |

### `/brief` — Sunday Brief (`app/brief/page.tsx`)

| Component | Purpose | Data | API | AI | Animation | State |
|---|---|---|---|---|---|---|
| `BriefExperience` | Composes the report, builds its scenes, re-measures scroll positions once built | `Brief`, `RadarRun` | `loadPageData({withBrief})` | — | `revealOnScroll`, `riseOnScroll`, `parallaxNumbers`, `mondayScene` | none |
| `BriefHero` | SUNDAY BRIEF, Sunday date, region, categories, videos analysed, headline, dek | brief + run | — | headline, dek | `briefIntro`: rules draw, letters rise, headline rises word by word, count-up | none |
| `TopOpportunity` | THE ONE TO WATCH: why it matters, momentum, creator coverage, recommended action | `topStory` + cluster | — | whyItMatters, action | title rises; stats count up | none |
| `BriefCluster` | 01…05: trend, why now, evidence, recommendation | `opportunities[]` + cluster videos | — | whyNow, recommendation | big number drifts (parallax); heading rises | none |
| `MondayPlan` | MONDAY MORNING: film this, format, angle, title, why, plus calculated backing | `mondayPlan` + cluster metrics | — | plan | `mondayScene`: pinned finale, title grows in, each line lands in turn (pins only when it fits the screen; phones reveal as they scroll) | none |
| `GenerateBriefButton` / `SendBriefButton` | Write or rewrite the brief; email it to the saved address | briefId, runId | `POST /api/brief/generate`, `POST /api/brief/send` | Gemini (generate) | — | busy / message |

### `/settings` (`app/settings/page.tsx`)

| Component | Purpose | Data | API | AI | Animation | State |
|---|---|---|---|---|---|---|
| `SettingsForm` | Creator name, categories (presets + custom keywords), region, language, lookback, videos per category, email + toggle; live quota estimate; Zod validation | `Settings` | `PUT /api/settings` → `user_settings` | — | — | form state |

---

## 5. Layout and shared components

| Component | Purpose | State |
|---|---|---|
| `layout/AppShell` | Skip link, TopNav, main, footer, `RadarProvider`, `LoadingRadar` | — |
| `layout/TopNav` | 01 Radar · 02 Trends · 03 Brief · Settings · theme button (`aria-current`); compact on phones so nothing is squeezed | pathname |
| `layout/ThemeToggle` | Light / dark switch; dark is the default; saved in localStorage and applied before first paint by `lib/theme.ts` | theme |
| `layout/PageTransition` | Route enter fade (`app/template.tsx`); opacity only, so pinned scenes stay fixed | — |
| `shared/RadarProvider` | Global run state; reads the NDJSON stream; `useCurrentRun` | stage, warnings, error, session run |
| `shared/LoadingRadar` | Full-screen scan dialog showing the server's real stages, elapsed time, warnings, errors (Esc closes) | reads context |
| `shared/RunRadarButton` | Starts a run with optional overrides | context |
| `shared/EmptyState` | "NO STRONG SIGNALS YET." plus guidance | — |
| `shared/ErrorState` | `role="alert"` friendly error (never a stack trace) | — |
| `shared/Metric`, `shared/SectionLabel`, `shared/Provenance` | Editorial primitives; `Provenance` renders OBSERVED / CALCULATED / AI INTERPRETATION / RECOMMENDATION | — |
| `ui/button` | shadcn/ui-style Button (cva + Radix Slot) | — |

## 6. API routes

| Route | Method | Purpose | External calls |
|---|---|---|---|
| `/api/radar/run` | POST | Full pipeline, streamed as NDJSON; reuses an identical run less than 20 minutes old unless `force` | YouTube, Gemini ×2, Supabase |
| `/api/radar/latest` | GET | Latest successful run, newer failure (if any), history | Supabase |
| `/api/radar/[id]` | GET | One stored run | Supabase |
| `/api/youtube/search` | GET | `?q&region&days&max`: search plus full stats | YouTube (~101 units) |
| `/api/youtube/videos` | GET | `?ids=`: fresh stats for up to 50 ids | YouTube (1 unit) |
| `/api/gemini/analyze` | POST | `{videoIds}`: stateless cluster + score for any 6–90 videos | YouTube, Gemini |
| `/api/settings` | GET / PUT | Read or validate-and-save settings | Supabase |
| `/api/brief/generate` | POST | `{runId?}`: write the brief for a run | Gemini, Supabase |
| `/api/brief/send` | POST | Email a brief to the saved address only | Resend, Supabase |
| `/api/cron/sunday` | GET | Sunday workflow (Bearer `CRON_SECRET`; `?force=1`) | all |
| `/api/cron/snapshots` | GET | Daily snapshot refresh | YouTube, Supabase |
| `/api/status` | GET | Which services are configured (booleans only) | — |

## 7. Library modules

| Module | Responsibility |
|---|---|
| `lib/youtube/client.ts` | search / videos / chart calls, error mapping (quota, key, unavailable), cache, quota meter |
| `lib/youtube/duration.ts` | ISO-8601 duration parsing and formatting |
| `lib/trends/signals.ts` | Engagement, views/hour, snapshot velocity |
| `lib/trends/normalize.ts` | min-max, log min-max, mean, median, sum (null-safe) |
| `lib/trends/scoring.ts` | **Trend score**: weights, factors, normalisation |
| `lib/trends/metrics.ts` | Coverage growth, momentum label, series, view history, formats, creators, suggested length, confidence |
| `lib/trends/prepare.ts` | Cluster preparation and the compact prompt table |
| `lib/gemini/client.ts` | Flash-only REST client, JSON mode |
| `lib/gemini/schemas.ts` | Zod schemas, grounding validation, Gemini response schemas |
| `lib/gemini/analyze.ts` | Analyst and editor prompts, retry-once |
| `lib/pipeline/runRadar.ts` | Orchestrates a scan; builds clusters and the reel |
| `lib/pipeline/brief.ts` | Writes and stores the brief |
| `lib/db/repo.ts` | All Supabase reads and writes |
| `lib/email/brief.ts` | Brief email HTML/text; Resend REST |
| `lib/trends/keyword.ts` | Short topic label for the orbit and rail (Gemini keyword, or shortened name for older scans) |
| `lib/theme.ts` | Theme storage key and the no-flash script |
| `lib/animations/gsap.ts` | Registers ScrollTrigger, SplitText, DrawSVG; re-measures after fonts load; `scheduleRefresh` |
| `lib/animations/motion.ts` | matchMedia conditions (desktop / phone / reduced motion) |
| `lib/animations/presets.ts` | Every scene builder (see below) |

## 8. Motion system

Components never hold large timelines. They mark their DOM with `data-*` attributes and call a builder from `lib/animations/presets.ts` inside `useGSAP` + `gsap.matchMedia`, so every ScrollTrigger is cleaned up on unmount and nothing runs with reduced motion.

```mermaid
flowchart LR
    MM[gsap.matchMedia] -->|desktop ≥900px| D[Pinned, scrubbed scenes]
    MM -->|phone <900px| M[Phone scenes: no pinning]
    MM -->|reduced motion| R[No animation: static layout]
    D --> D1[heroIntro · radarAmbient · statementScene · reelScene · topicRevealScene · formationScene · momentumScene · steppedScene]
    D --> D2[trendsIntro · topicScene · detailsOpen · topicRail · briefIntro · parallaxNumbers · mondayScene]
    M --> M1[reelMobile · statementMobile · topicRevealMobile · formationMobile · momentumMobile · steppedMobile]
    D2 & M1 --> H[Helpers: splitRise · countIn · growBars · revealOnScroll · revealEach · countUp]
```

Rules that keep it reliable:
- Only `transform`, `opacity`, `clip-path` and SVG stroke are animated.
- Counters always finish on the real value; only the tween is visual.
- Triggers that should play once use `toggleActions: "play none none none"` rather than `once: true`, which can remove a trigger while GSAP is still measuring the page.
- Text split for animation is restored to plain text once it has landed, so descenders are never clipped.

