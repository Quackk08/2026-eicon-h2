-- Action templates can now be generated for one person's Life Vision.
--
-- Until now every Route came from the same 16 reviewed seed steps, so a
-- Vision about "a comfortable and enjoyable life" still produced a ladder
-- about studying at a cafe. profile_id scopes a generated ladder to its
-- owner; source records where a step came from so reviewed content and
-- generated content stay distinguishable.
alter table action_templates
  add column if not exists profile_id uuid references profiles(id) on delete cascade,
  add column if not exists source text not null default 'seed';

alter table action_templates
  drop constraint if exists action_templates_source_check;
alter table action_templates
  add constraint action_templates_source_check check (source in ('seed', 'ai'));

create index if not exists idx_action_templates_profile on action_templates (profile_id);
