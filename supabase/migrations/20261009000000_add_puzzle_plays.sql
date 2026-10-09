create table if not exists public.puzzle_plays (
  puzzle_number integer not null,
  player_id text not null check (char_length(player_id) between 8 and 128),
  first_played_at timestamptz not null default now(),
  primary key (puzzle_number, player_id)
);

alter table public.puzzle_plays enable row level security;
