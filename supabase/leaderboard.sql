-- Duck Hunt Idle: online names, leaderboard and the owner's progress page.
--
-- Paste all of this into Supabase → SQL Editor → New query, change the
-- admin password on the LAST line, and press Run. Running it again is safe.
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
create or replace function public.report_progress(p_id uuid, p_secret text, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  update players set
    last_seen  = now(),
    lodge      = least(greatest(coalesce((p->>'lodge')::int, 1), 1), 99),
    birds      = greatest(coalesce((p->>'birds')::double precision, 0), 0),
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

-- The leaderboard: the top players for one ranking ('birds', 'lodge' or 'stars'),
-- plus your own row (is_me) even when you're further down.
create or replace function public.leaderboard(p_sort text, p_limit int default 50, p_id uuid default null)
returns table (rank bigint, name text, lodge int, birds double precision, species int, stars int, is_me boolean)
language sql stable security definer set search_path = public as $$
  with ranked as (
    select
      rank() over (order by
        case when p_sort = 'lodge' then lodge when p_sort = 'stars' then stars else 0 end desc,
        birds desc) as rank,
      p.name, p.lodge, p.birds, p.species, p.stars, coalesce(p.id = p_id, false) as is_me
    from players p
  )
  select * from ranked
  where rank <= least(greatest(coalesce(p_limit, 50), 1), 200) or is_me
  order by rank, name
$$;

-- ---------------------------------------------------------------- owner's page

-- Every player with full details. Needs the admin password.
create or replace function public.admin_players(p_password text)
returns table (
  name text, created_at timestamptz, last_seen timestamptz, lodge int, birds double precision,
  species int, stars int, seasons int, coins double precision, day int, play_hours double precision,
  flyway text, build text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from admin_config where id = 1 and password_hash = dhi_hash(p_password)) then
    raise exception 'wrong_password';
  end if;
  return query
    select p.name, p.created_at, p.last_seen, p.lodge, p.birds, p.species, p.stars, p.seasons,
           p.coins, p.day, p.play_hours, p.flyway, p.build
    from players p order by p.last_seen desc;
end $$;

-- Only the dashboard (not the game) may set the admin password.
create or replace function public.set_admin_password(p_password text) returns void
language sql security definer set search_path = public as $$
  insert into admin_config (id, password_hash) values (1, dhi_hash(p_password))
  on conflict (id) do update set password_hash = excluded.password_hash
$$;

-- ---------------------------------------------------------------- who may call what

revoke all on function public.dhi_hash(text), public.dhi_name_key(text), public.dhi_check_name(text),
  public.set_admin_password(text) from public, anon, authenticated;
grant execute on function public.name_available(text), public.join_game(text, text),
  public.rename_player(uuid, text, text), public.report_progress(uuid, text, jsonb),
  public.leaderboard(text, int, uuid), public.admin_players(text) to anon, authenticated;

-- ---------------------------------------------------------------- your admin password
-- Change CHANGE-ME to a password only you know (you'll type it on the progress page).
select public.set_admin_password('CHANGE-ME');
