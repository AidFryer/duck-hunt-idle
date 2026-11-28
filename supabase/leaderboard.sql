-- Duck Hunt Idle: online names, leaderboard and the owner's progress page.
--
-- Paste all of this into Supabase → SQL Editor → New query and press Run.
-- First time only: change CHANGE-ME on the LAST line to your admin password.
-- Running it again later (to pick up updates) is safe and keeps your password.
--
-- How it's protected: the game only ever uses the public "anon" key, so
-- nobody can read or write the players table directly. Everything goes
-- through the functions below:
--   * a player proves it's them with a secret their own save keeps
--     (only a hash of it is stored here);
--   * the leaderboard shows names and progress only;
--   * the full list (last seen, version, ...) needs the admin password.

-- ---------------------------------------------------------------- tables

create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  secret_hash text not null,
  name        text not null,
  name_key    text not null unique,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  lodge       int not null default 1,
  birds       double precision not null default 0,
  species     int not null default 0,
  stars       int not null default 0,
  seasons     int not null default 0,
  coins       double precision not null default 0,
  day         int not null default 1,
  play_hours  double precision not null default 0,
  flyway      text not null default '',
  build       text not null default ''
);

create table if not exists public.admin_config (
  id            int primary key default 1 check (id = 1),
  password_hash text not null
);

-- Added in later updates (safe to run again).
alter table public.players add column if not exists week_key   text not null default '';
alter table public.players add column if not exists week_base  double precision not null default 0;
alter table public.players add column if not exists week_birds double precision not null default 0;
alter table public.players add column if not exists reported   boolean not null default false;
alter table public.players add column if not exists hidden     boolean not null default false;
-- Cloud save: the latest copy of each player's save, and a hash of their restore code.
alter table public.players add column if not exists save_code    text;
alter table public.players add column if not exists saved_at     timestamptz;
alter table public.players add column if not exists restore_hash text;
alter table public.players add column if not exists restore_fails int not null default 0;
alter table public.players add column if not exists restore_lock timestamptz;

-- Nobody touches the tables directly; only the functions below do.
alter table public.players enable row level security;
alter table public.admin_config enable row level security;
revoke all on public.players from anon, authenticated;
revoke all on public.admin_config from anon, authenticated;

-- ---------------------------------------------------------------- helpers

create or replace function public.dhi_hash(p text) returns text
language sql immutable as $$
  select encode(sha256(convert_to(coalesce(p, ''), 'UTF8')), 'hex')
$$;

-- This week's key (ISO week, starts Monday 00:00 UTC), e.g. '2026-48'.
create or replace function public.dhi_week() returns text
language sql stable as $$
  select to_char(now() at time zone 'utc', 'IYYY-IW')
$$;

-- Is this the admin password? (The placeholder never counts.)
create or replace function public.dhi_admin_ok(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p, '') <> 'CHANGE-ME'
     and exists (select 1 from admin_config where id = 1 and password_hash = dhi_hash(p))
$$;

-- Names: 2-20 letters, numbers, spaces and . ' - _ ; compared ignoring case and extra spaces.
create or replace function public.dhi_name_key(p text) returns text
language sql immutable as $$
  select lower(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g'))
$$;

create or replace function public.dhi_check_name(p text) returns text
language plpgsql immutable as $$
declare n text := regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g');
begin
  if char_length(n) < 2 or char_length(n) > 20 then raise exception 'bad_name_length'; end if;
  if n !~ '^[[:alnum:] .''_-]+$' then raise exception 'bad_name_chars'; end if;
  return n;
end $$;

-- ---------------------------------------------------------------- game calls

-- Is this name free? (true/false; a badly formed name counts as not free)
create or replace function public.name_available(p_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  perform dhi_check_name(p_name);
  return not exists (select 1 from players where name_key = dhi_name_key(p_name));
exception when others then
  return false;
end $$;

-- Join with a name. Returns the new player id; raises 'name_taken' if someone has it.
create or replace function public.join_game(p_name text, p_secret text) returns uuid
language plpgsql security definer set search_path = public as $$
declare n text := dhi_check_name(p_name); new_id uuid;
begin
  if char_length(coalesce(p_secret, '')) < 16 then raise exception 'bad_secret'; end if;
  insert into players (secret_hash, name, name_key)
  values (dhi_hash(p_secret), n, dhi_name_key(n))
  returning id into new_id;
  return new_id;
exception when unique_violation then
  raise exception 'name_taken';
end $$;

-- Change your name. Raises 'name_taken' or 'not_found'.
create or replace function public.rename_player(p_id uuid, p_secret text, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare n text := dhi_check_name(p_name);
begin
  update players set name = n, name_key = dhi_name_key(n), last_seen = now()
  where id = p_id and secret_hash = dhi_hash(p_secret);
  if not found then raise exception 'not_found'; end if;
exception when unique_violation then
  raise exception 'name_taken';
end $$;

-- Send your progress. Raises 'not_found' if the id/secret don't match.
-- Also keeps this week's count: birds since the first report this week.
create or replace function public.report_progress(p_id uuid, p_secret text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  cur text := dhi_week();
  nb double precision := greatest(coalesce((p->>'birds')::double precision, 0), 0);
begin
  update players set
    week_base  = case
                   when not reported then nb                 -- first report: start counting now
                   when week_key <> cur then least(birds, nb) -- a new week
                   when nb < birds then 0                     -- the save started over
                   else week_base end,
    week_birds = greatest(0, nb - case
                   when not reported then nb
                   when week_key <> cur then least(birds, nb)
                   when nb < birds then 0
                   else week_base end),
    week_key   = cur,
    reported   = true,
    last_seen  = now(),
    lodge      = least(greatest(coalesce((p->>'lodge')::int, 1), 1), 99),
    birds      = nb,
    species    = least(greatest(coalesce((p->>'species')::int, 0), 0), 999),
    stars      = greatest(coalesce((p->>'stars')::int, 0), 0),
    seasons    = greatest(coalesce((p->>'seasons')::int, 0), 0),
    coins      = greatest(coalesce((p->>'coins')::double precision, 0), 0),
    day        = greatest(coalesce((p->>'day')::int, 1), 1),
    play_hours = greatest(coalesce((p->>'playHours')::double precision, 0), 0),
    flyway     = left(coalesce(p->>'flyway', ''), 20),
    build      = left(coalesce(p->>'build', ''), 20)
  where id = p_id and secret_hash = dhi_hash(p_secret);
  if not found then raise exception 'not_found'; end if;
end $$;

-- Cloud save: keep the latest copy of your save online. p_restore is the short
-- code the game shows the player (only its hash is kept). Returns when it was saved.
create or replace function public.cloud_save(p_id uuid, p_secret text, p_code text, p_restore text) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz := now();
begin
  if char_length(coalesce(p_code, '')) < 20 or char_length(p_code) > 2000000 then raise exception 'bad_save'; end if;
  if char_length(coalesce(p_restore, '')) <> 8 then raise exception 'bad_save'; end if;
  update players set save_code = p_code, saved_at = t, restore_hash = dhi_hash(upper(p_restore)), last_seen = t
  where id = p_id and secret_hash = dhi_hash(p_secret);
  if not found then raise exception 'not_found'; end if;
  return t;
end $$;

-- Bring a cloud save back on any device, with the player's name and restore code.
-- Five wrong codes in a row lock that name's restore for 15 minutes.
-- Returns {ok, code, saved_at} or {ok: false, why: 'no_save' | 'wrong_code' | 'locked'}.
create or replace function public.cloud_restore(p_name text, p_restore text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r players%rowtype;
begin
  select * into r from players where name_key = dhi_name_key(p_name);
  if not found or r.save_code is null then return jsonb_build_object('ok', false, 'why', 'no_save'); end if;
  if r.restore_lock is not null and r.restore_lock > now() then return jsonb_build_object('ok', false, 'why', 'locked'); end if;
  if r.restore_hash is distinct from dhi_hash(upper(coalesce(p_restore, ''))) then
    update players set
      restore_fails = case when restore_fails + 1 >= 5 then 0 else restore_fails + 1 end,
      restore_lock  = case when restore_fails + 1 >= 5 then now() + interval '15 minutes' else restore_lock end
    where id = r.id;
    return jsonb_build_object('ok', false, 'why', 'wrong_code');
  end if;
  update players set restore_fails = 0, restore_lock = null where id = r.id;
  return jsonb_build_object('ok', true, 'code', r.save_code, 'saved_at', r.saved_at);
end $$;

-- The leaderboard: the top players for one ranking ('week', 'birds', 'lodge' or 'stars'),
-- plus your own row (is_me) even when you're further down. Hidden players
-- (set from the owner's page) only ever see themselves.
drop function if exists public.leaderboard(text, int, uuid);
create or replace function public.leaderboard(p_sort text, p_limit int default 50, p_id uuid default null)
returns table (rank bigint, name text, lodge int, birds double precision, species int, stars int, week_birds double precision, is_me boolean)
language sql stable security definer set search_path = public as $$
  with shown as (
    select p.*, case when p.week_key = dhi_week() then p.week_birds else 0 end as wk
    from players p
    where not p.hidden or p.id = p_id
  ), ranked as (
    select
      rank() over (order by
        case when p_sort = 'week' then wk else 0 end desc,
        case when p_sort = 'lodge' then lodge when p_sort = 'stars' then stars else 0 end desc,
        birds desc) as rank,
      name, lodge, birds, species, stars, wk as week_birds, coalesce(id = p_id, false) as is_me
    from shown
  )
  select * from ranked
  where rank <= least(greatest(coalesce(p_limit, 50), 1), 200) or is_me
  order by rank, name
$$;

-- ---------------------------------------------------------------- owner's page

-- Every player with full details. Needs the admin password.
drop function if exists public.admin_players(text);
create or replace function public.admin_players(p_password text)
returns table (
  id uuid, name text, created_at timestamptz, last_seen timestamptz, lodge int, birds double precision,
  species int, stars int, seasons int, coins double precision, day int, play_hours double precision,
  flyway text, build text, week_birds double precision, hidden boolean, saved_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not dhi_admin_ok(p_password) then raise exception 'wrong_password'; end if;
  return query
    select p.id, p.name, p.created_at, p.last_seen, p.lodge, p.birds, p.species, p.stars, p.seasons,
           p.coins, p.day, p.play_hours, p.flyway, p.build,
           case when p.week_key = dhi_week() then p.week_birds else 0 end, p.hidden, p.saved_at
    from players p order by p.last_seen desc;
end $$;

-- Hide a player from the public board (they still see themselves), or show them again.
create or replace function public.admin_set_hidden(p_password text, p_id uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not dhi_admin_ok(p_password) then raise exception 'wrong_password'; end if;
  update players set hidden = coalesce(p_hidden, false) where id = p_id;
end $$;

-- One player's cloud save code (to send them if they lose their lodge).
create or replace function public.admin_get_save(p_password text, p_id uuid) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not dhi_admin_ok(p_password) then raise exception 'wrong_password'; end if;
  return (select save_code from players where id = p_id);
end $$;

-- Remove a player for good and free their name. (If they play again, they rejoin.)
create or replace function public.admin_remove_player(p_password text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not dhi_admin_ok(p_password) then raise exception 'wrong_password'; end if;
  delete from players where id = p_id;
end $$;

-- Only the dashboard (not the game) may set the admin password.
create or replace function public.set_admin_password(p_password text) returns void
language sql security definer set search_path = public as $$
  insert into admin_config (id, password_hash) values (1, dhi_hash(p_password))
  on conflict (id) do update set password_hash = excluded.password_hash
$$;

-- ---------------------------------------------------------------- who may call what

revoke all on function public.dhi_hash(text), public.dhi_name_key(text), public.dhi_check_name(text),
  public.dhi_admin_ok(text), public.set_admin_password(text) from public, anon, authenticated;
grant execute on function public.name_available(text), public.join_game(text, text),
  public.rename_player(uuid, text, text), public.report_progress(uuid, text, jsonb),
  public.leaderboard(text, int, uuid), public.admin_players(text),
  public.admin_set_hidden(text, uuid, boolean), public.admin_remove_player(text, uuid),
  public.cloud_save(uuid, text, text, text), public.cloud_restore(text, text),
  public.admin_get_save(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------- your admin password
-- First time only: change CHANGE-ME to a password only you know (you'll type
-- it on the players page). Once a password is set, this line leaves it alone.
-- To change it later, run on its own:  select public.set_admin_password('new password');
select public.set_admin_password('CHANGE-ME') where not exists (select 1 from public.admin_config);
