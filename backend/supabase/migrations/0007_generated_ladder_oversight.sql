-- Oversight for generated ladders.
--
-- Generated steps reach users without prior human review, so the safeguards
-- that replace that review have to leave a trail: every generation attempt is
-- recorded with its verdict (so rejected output can be studied, not just
-- silently dropped), and users can report a step that should not have shipped.

create table if not exists generated_ladder_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  domain text,
  vision_summary text not null,
  raw_response text,
  verdict text not null,
  reject_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_generated_ladder_log_verdict on generated_ladder_log (verdict, created_at desc);

create table if not exists action_template_reports (
  id uuid primary key default gen_random_uuid(),
  template_id text not null references action_templates(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_action_template_reports_template on action_template_reports (template_id);

alter table generated_ladder_log enable row level security;
alter table action_template_reports enable row level security;
