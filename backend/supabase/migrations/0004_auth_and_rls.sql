-- Auth support + lock down direct PostgREST access.
--
-- Enabling Supabase Auth means the browser holds a publishable (anon) key.
-- Without RLS, that key can read and write every table through PostgREST,
-- bypassing this backend entirely. Enabling RLS with no policies denies all
-- anon/authenticated access; the backend keeps working because it connects
-- with the secret (service-role) key, which bypasses RLS by design.
--
-- Consequence to remember: any future browser-side Supabase data access
-- needs an explicit policy added here first.

alter table profiles              enable row level security;
alter table preferences           enable row level security;
alter table life_visions          enable row level security;
alter table life_routes           enable row level security;
alter table route_steps           enable row level security;
alter table action_templates      enable row level security;
alter table check_ins             enable row level security;
alter table checkin_rhythms       enable row level security;
alter table recommendations       enable row level security;
alter table missions              enable row level security;
alter table reflections           enable row level security;
alter table places                enable row level security;
alter table saved_places          enable row level security;
alter table community_activities  enable row level security;
alter table participations        enable row level security;
alter table trusted_contacts      enable row level security;
alter table support_messages      enable row level security;
alter table sync_operations       enable row level security;
alter table community_reports     enable row level security;

-- A guest profile has no auth user yet. Once someone signs up, their
-- existing guest profile is linked here so their history carries over
-- rather than starting over with a new empty account.
create index if not exists idx_profiles_auth_user on profiles (auth_user_id);
