-- Fields used by the integrated frontend but missing from the original MVP tables.
alter table profiles
  add column if not exists display_name text;

alter table missions
  add column if not exists scheduled_at timestamptz;

update missions
set scheduled_at = scheduled_for::timestamp + interval '12 hours'
where scheduled_at is null;

create index if not exists idx_missions_profile_scheduled_at
  on missions (profile_id, scheduled_at desc);

alter table action_templates
  drop constraint if exists action_templates_source_check;
alter table action_templates
  add constraint action_templates_source_check check (source in ('seed', 'ai', 'user'));
