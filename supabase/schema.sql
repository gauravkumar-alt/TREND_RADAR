-- TREND//RADAR — Supabase / PostgreSQL schema
-- Run once in the Supabase SQL editor (or `psql "$DATABASE_URL" -f supabase/schema.sql`).
-- Safe to re-run: every statement is idempotent.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Settings (single creator; row id 'default')
-- ---------------------------------------------------------------------------
create table if not exists user_settings (
  id          text primary key default 'default',
  settings    jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Videos: latest known metadata per YouTube video (stats live in snapshots)
-- ---------------------------------------------------------------------------
create table if not exists videos (
  id                text primary key,              -- YouTube video id
  title             text not null,
  description       text not null default '',
  channel_id        text not null,
  channel_title     text not null,
  published_at      timestamptz not null,
  thumbnail_url     text not null,
  duration_seconds  integer,
  category_id       text,
  region_code       text not null,
  source_category   text not null,
  first_seen_at     timestamptz not null default now(),
  last_seen_at      timestamptz not null default now()
);
create index if not exists videos_published_at_idx on videos (published_at desc);
create index if not exists videos_channel_idx on videos (channel_id);
create index if not exists videos_last_seen_idx on videos (last_seen_at desc);

-- ---------------------------------------------------------------------------
-- Snapshots: observed stats over time. Source of all historical growth.
-- ---------------------------------------------------------------------------
create table if not exists video_snapshots (
  id           bigint generated always as identity primary key,
  video_id     text not null references videos (id) on delete cascade,
  captured_at  timestamptz not null default now(),
  views        bigint,
  likes        bigint,
  comments     bigint,
  constraint video_snapshots_unique unique (video_id, captured_at)
);
create index if not exists video_snapshots_video_time_idx on video_snapshots (video_id, captured_at desc);

-- ---------------------------------------------------------------------------
-- Radar runs
-- ---------------------------------------------------------------------------
create table if not exists trend_runs (
  id               uuid primary key default gen_random_uuid(),
  status           text not null check (status in ('running', 'succeeded', 'failed')),
  trigger          text not null default 'manual' check (trigger in ('manual', 'cron')),
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,
  settings         jsonb not null,
  settings_key     text not null,
  videos_fetched   integer not null default 0,
  videos_analyzed  integer not null default 0,
  quota_units      integer not null default 0,
  model            text,
  error_code       text,
  error_message    text,
  payload          jsonb                            -- full computed RadarRun for fast reads
);
create index if not exists trend_runs_status_started_idx on trend_runs (status, started_at desc);
create index if not exists trend_runs_settings_key_idx on trend_runs (settings_key, completed_at desc);

create table if not exists trend_clusters (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null references trend_runs (id) on delete cascade,
  cluster_key      text not null,                  -- "c1".."c5" within the run
  rank             smallint not null check (rank between 1 and 10),
  name             text not null,
  summary          text not null,
  score            smallint not null check (score between 0 and 100),
  momentum         text not null check (momentum in ('RISING', 'STABLE', 'COOLING', 'BUILDING BASELINE')),
  confidence       text not null check (confidence in ('HIGH', 'MEDIUM', 'LOW')),
  metrics          jsonb not null,                 -- CALCULATED
  score_breakdown  jsonb not null,                 -- CALCULATED
  formats          jsonb not null,                 -- CALCULATED from AI classifications
  ai               jsonb not null,                 -- AI INTERPRETATION + RECOMMENDATION
  created_at       timestamptz not null default now(),
  constraint trend_clusters_run_rank_unique unique (run_id, rank),
  constraint trend_clusters_run_key_unique unique (run_id, cluster_key)
);
create index if not exists trend_clusters_run_idx on trend_clusters (run_id);

create table if not exists cluster_videos (
  cluster_id  uuid not null references trend_clusters (id) on delete cascade,
  video_id    text not null references videos (id) on delete cascade,
  position    smallint not null,
  format      text,
  primary key (cluster_id, video_id)
);
create index if not exists cluster_videos_video_idx on cluster_videos (video_id);

-- ---------------------------------------------------------------------------
-- Sunday briefs and email deliveries
-- ---------------------------------------------------------------------------
create table if not exists briefs (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references trend_runs (id) on delete cascade,
  week_of     date not null,
  content     jsonb not null,
  model       text not null,
  created_at  timestamptz not null default now(),
  constraint briefs_run_unique unique (run_id)
);
create index if not exists briefs_created_idx on briefs (created_at desc);

create table if not exists brief_deliveries (
  id           uuid primary key default gen_random_uuid(),
  brief_id     uuid not null references briefs (id) on delete cascade,
  recipient    text not null,
  status       text not null check (status in ('sent', 'failed')),
  provider_id  text,
  error        text,
  created_at   timestamptz not null default now()
);
create index if not exists brief_deliveries_brief_idx on brief_deliveries (brief_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: no public policies. Only the server (service role) reads/writes.
-- ---------------------------------------------------------------------------
alter table user_settings     enable row level security;
alter table videos            enable row level security;
alter table video_snapshots   enable row level security;
alter table trend_runs        enable row level security;
alter table trend_clusters    enable row level security;
alter table cluster_videos    enable row level security;
alter table briefs            enable row level security;
alter table brief_deliveries  enable row level security;
