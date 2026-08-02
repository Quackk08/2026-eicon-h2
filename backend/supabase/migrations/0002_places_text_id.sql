-- Switch places.id from uuid to text so reviewed seed places can use
-- stable, readable ids (e.g. "place-riverside-library"), matching the
-- pattern already used by action_templates.id.

alter table saved_places drop constraint if exists saved_places_place_id_fkey;
alter table places alter column id drop default;
alter table places alter column id type text using id::text;
alter table saved_places alter column place_id type text using place_id::text;
alter table saved_places
  add constraint saved_places_place_id_fkey foreign key (place_id) references places(id) on delete cascade;
