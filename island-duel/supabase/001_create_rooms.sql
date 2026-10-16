-- Game-specific persistence. This must not modify Catanlike's existing tables.
-- Apply only to the Supabase instance selected for the standalone Island Duel demo.
create table if not exists public.hamsa_island_duel_rooms (
  room_code text primary key,
  player_one_token text not null,
  player_two_token text,
  game jsonb not null,
  revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hamsa_island_duel_rooms enable row level security;
create index if not exists hamsa_island_duel_rooms_updated_idx
  on public.hamsa_island_duel_rooms(updated_at);
-- The server's service-role key accesses rooms; neither browser client
-- nor Supabase anon/authenticated roles receive direct table access.
revoke all on public.hamsa_island_duel_rooms from anon, authenticated;
