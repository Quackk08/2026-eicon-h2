-- A Mission happens somewhere. Until now the chosen place lived only in the
-- browser, so "which cafe was this?" was lost on reload and the place
-- recommendation endpoint had nowhere to record its answer.
alter table missions
  add column if not exists place_id text references places(id) on delete set null;

create index if not exists idx_missions_place on missions (place_id);
