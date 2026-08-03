-- Switch community_activities.id from uuid to text, matching the stable
-- slug-id pattern already used by action_templates.id and places.id for
-- reviewed content.
alter table participations drop constraint if exists participations_activity_id_fkey;
alter table community_activities alter column id drop default;
alter table community_activities alter column id type text using id::text;
alter table participations alter column activity_id type text using activity_id::text;
alter table participations
  add constraint participations_activity_id_fkey foreign key (activity_id) references community_activities(id) on delete cascade;

-- Lightweight reporting path for Community, per PRODUCT_GUARDRAILS.md
-- ("Provide join cancellation, reporting, and blocking paths"). Reports
-- target activity content, not other users — this MVP never exposes
-- participant identities to each other, so there is nothing to report a
-- specific person for yet.
create table if not exists community_reports (
  id uuid primary key default gen_random_uuid(),
  activity_id text not null references community_activities(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_community_reports_activity on community_reports (activity_id);
