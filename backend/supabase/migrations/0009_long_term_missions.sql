-- The one-to-two month layer the product promised and never had.
--
-- Until now a person had a Life Vision with no horizon at all and a Mission
-- that expired at midnight, and nothing in between: no way to see that
-- today's ten minutes were part of anything, and no moment where a stretch
-- of effort could be called finished.
--
-- A long-term mission is deliberately not a second kind of Mission. It is
-- the commitment the Route already implies — reach the top of this ladder,
-- by this date, having done it this many times — so it stores the horizon
-- and the target, and takes its progress from the short-term missions that
-- point at it. Nothing here duplicates a column the missions table has.

create table if not exists long_term_missions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  vision_id uuid not null references life_visions(id) on delete cascade,
  route_id uuid references life_routes(id) on delete set null,
  title text not null,
  -- Why this horizon and this target, in the rule engine's own words, kept
  -- so the app can always answer "why two months" without recomputing it
  -- against preferences that have since changed.
  rationale text,
  starts_on date not null default current_date,
  ends_on date not null,
  -- How many completed short-term missions count as having arrived.
  target_count integer not null check (target_count > 0),
  status text not null default 'active'
    check (status in ('active', 'paused', 'achieved', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One to two months, enforced here rather than trusted from the caller:
  -- the horizon is the whole point of the row.
  constraint long_term_missions_horizon check (ends_on > starts_on)
);

-- Which long-term mission today's action was advancing. Nullable and
-- `set null` on delete: a Mission is a complete record of something someone
-- did, and must not disappear or become invalid because the longer goal it
-- belonged to was abandoned.
alter table missions
  add column if not exists long_term_mission_id uuid
    references long_term_missions(id) on delete set null;

create index if not exists idx_long_term_missions_profile
  on long_term_missions (profile_id, status);

create index if not exists idx_long_term_missions_vision
  on long_term_missions (vision_id);

-- Progress is counted by this, on every dashboard load.
create index if not exists idx_missions_long_term
  on missions (long_term_mission_id, status);

alter table long_term_missions enable row level security;
