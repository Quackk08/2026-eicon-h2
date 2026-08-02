-- ReNew MVP schema — matches docs/IMPLEMENTATION_PLAN.md domain modules
-- and shared/src/*.ts contracts. Run this once in the Supabase SQL Editor
-- (or via `supabase db push` if you adopt the Supabase CLI later).

create extension if not exists "pgcrypto";

-- ── Identity ────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  locale text not null default 'ko',
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now()
);

-- ── Preferences ─────────────────────────────────────────────────────────
create table if not exists preferences (
  profile_id uuid primary key references profiles(id) on delete cascade,
  max_minutes integer,
  max_distance_meters integer,
  max_cost numeric,
  social_preference text check (social_preference in ('solo', 'low', 'medium', 'high')),
  accessibility_needs text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ── Vision & Route ──────────────────────────────────────────────────────
create table if not exists life_visions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  domain text not null check (
    domain in (
      'study_school', 'sleep_energy', 'relationships', 'movement_health',
      'creativity', 'daily_independence', 'community_participation', 'stress_recovery'
    )
  ),
  summary text not null,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists life_routes (
  id uuid primary key default gen_random_uuid(),
  vision_id uuid not null references life_visions(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists route_steps (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references life_routes(id) on delete cascade,
  sequence integer not null,
  template_id text not null,
  ladder_level integer not null,
  status text not null default 'pending' check (status in ('pending', 'current', 'done', 'skipped')),
  created_at timestamptz not null default now()
);

-- ── Action templates (reviewed seed data — never AI-generated) ─────────
create table if not exists action_templates (
  id text primary key,
  goal_domains text[] not null,
  title text not null,
  min_capacity integer not null check (min_capacity between 0 and 4),
  max_social_load integer not null check (max_social_load between 0 and 4),
  duration_min_minutes integer not null,
  duration_max_minutes integer not null,
  cost_level integer not null check (cost_level between 0 and 4),
  place_types text[] not null default '{}',
  indoor_outdoor text not null check (indoor_outdoor in ('indoor', 'outdoor', 'either')),
  ladder_group_id text not null,
  ladder_level integer not null,
  safety_tags text[] not null default '{}'
);

-- ── Check-In ────────────────────────────────────────────────────────────
-- Missing values stay NULL (never 0) per PRODUCT_GUARDRAILS.md.
create table if not exists check_ins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  local_id text not null,
  type text not null check (type in ('quick', 'standard', 'weekly')),
  captured_at timestamptz not null,
  mood integer not null check (mood between 0 and 4),
  energy integer not null check (energy between 0 and 4),
  functional_capacity integer not null check (functional_capacity between 0 and 4),
  stress integer check (stress between 0 and 4),
  sleep_quality integer check (sleep_quality between 0 and 4),
  loneliness integer check (loneliness between 0 and 4),
  social_load integer check (social_load between 0 and 4),
  initiation_difficulty integer check (initiation_difficulty between 0 and 4),
  craving integer check (craving between 0 and 4),
  note text,
  created_at timestamptz not null default now(),
  unique (profile_id, local_id)
);

create table if not exists checkin_rhythms (
  profile_id uuid primary key references profiles(id) on delete cascade,
  rhythm_type text not null default 'on_demand',
  interval_days integer,
  specific_day text,
  preferred_time text default '19:00',
  intensive_until timestamptz,
  intensive_previous jsonb,
  paused_until timestamptz,
  next_checkin_at timestamptz,
  last_checkin_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ── Recommendation (audit trail of what was offered) ───────────────────
create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  check_in_id uuid references check_ins(id) on delete set null,
  contract_version integer not null default 1,
  selected_template_id text not null references action_templates(id),
  smaller_template_id text references action_templates(id),
  extension_template_id text references action_templates(id),
  summary text not null,
  user_facing_reason text not null,
  source text not null default 'rules' check (source in ('rules', 'ai')),
  warnings text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ── Mission ─────────────────────────────────────────────────────────────
create table if not exists missions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  recommendation_id uuid references recommendations(id) on delete set null,
  template_id text not null references action_templates(id),
  route_step_id uuid references route_steps(id) on delete set null,
  status text not null default 'planned' check (
    status in ('planned', 'in_progress', 'completed', 'partially_completed', 'not_today', 'cancelled')
  ),
  scheduled_for date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Reflection ──────────────────────────────────────────────────────────
create table if not exists reflections (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  result text not null check (result in ('completed', 'partially_completed', 'not_today')),
  burden integer check (burden between 0 and 4),
  social_mode text check (social_mode in ('alone', 'with_someone')),
  want_repeat boolean,
  note text,
  created_at timestamptz not null default now()
);

-- ── Place ───────────────────────────────────────────────────────────────
create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  address_region text,
  distance_bucket text,
  hours text,
  cost_level integer check (cost_level between 0 and 4),
  crowd_level text,
  social_level text,
  accessibility text,
  is_partner boolean not null default false,
  verified_at date,
  notes text
);

create table if not exists saved_places (
  profile_id uuid not null references profiles(id) on delete cascade,
  place_id uuid not null references places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, place_id)
);

-- ── Community ───────────────────────────────────────────────────────────
create table if not exists community_activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  domain text,
  starts_at timestamptz,
  is_online boolean not null default false,
  location text,
  duration_minutes integer,
  social_load integer check (social_load between 0 and 4),
  max_participants integer,
  required_items text,
  created_at timestamptz not null default now()
);

create table if not exists participations (
  activity_id uuid not null references community_activities(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'joined' check (status in ('joined', 'cancelled')),
  created_at timestamptz not null default now(),
  primary key (activity_id, profile_id)
);

-- ── Support ─────────────────────────────────────────────────────────────
create table if not exists trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  relationship text,
  phone text,
  created_at timestamptz not null default now()
);

-- message_preview/included_data/excluded_data exist so the UI can show
-- "recipient, channel, full message, included data, excluded data" before
-- handoff, per PRODUCT_GUARDRAILS.md — approval is required, never automatic.
create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  trusted_contact_id uuid references trusted_contacts(id) on delete set null,
  channel text not null check (channel in ('sms', 'tel')),
  message_preview text not null,
  included_data text[] not null default '{}',
  excluded_data text[] not null default '{}',
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── Sync (offline queue audit — mirrors shared/src/offline.ts) ─────────
create table if not exists sync_operations (
  idempotency_key text primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  entity_type text not null,
  entity_local_id text not null,
  operation text not null check (operation in ('create', 'update', 'delete')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'syncing', 'synced', 'conflict', 'failed')),
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_check_ins_profile on check_ins (profile_id, created_at desc);
create index if not exists idx_missions_profile_date on missions (profile_id, scheduled_for desc);
create index if not exists idx_reflections_profile on reflections (profile_id, created_at desc);
create index if not exists idx_life_visions_profile on life_visions (profile_id);
create index if not exists idx_route_steps_route on route_steps (route_id, sequence);
