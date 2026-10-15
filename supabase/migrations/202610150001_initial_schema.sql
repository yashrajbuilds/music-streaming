-- YR MUSIC Supabase foundation.
-- Apply with Supabase CLI or the SQL editor. This migration is additive and does not touch songs.json or local MP3 files.

create extension if not exists pgcrypto;

create table if not exists public.owner_authorizations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role = 'owner'),
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.owner_authorizations
    where user_id = auth.uid() and role = 'owner'
  );
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to anon, authenticated;

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null check (length(trim(title)) between 1 and 200),
  artist text not null check (length(trim(artist)) between 1 and 200),
  album text,
  language text not null check (length(trim(language)) between 1 and 80),
  genre text not null check (length(trim(genre)) between 1 and 100),
  duration_seconds integer check (duration_seconds is null or duration_seconds between 1 and 86400),
  artwork_path text,
  audio_path text,
  local_audio_reference text,
  source text not null default 'supabase' check (source in ('local', 'supabase')),
  publication_status text not null default 'draft' check (publication_status in ('draft', 'published', 'archived')),
  catalog_rank integer not null default 999 check (catalog_rank >= 0),
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint songs_playable_source check (audio_path is not null or local_audio_reference is not null or publication_status <> 'published')
);

create index if not exists songs_publication_idx on public.songs (publication_status, catalog_rank, created_at desc);
create index if not exists songs_language_idx on public.songs (language, publication_status);
create index if not exists songs_search_idx on public.songs using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(artist, '') || ' ' || coalesce(album, '') || ' ' || coalesce(genre, '')));

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  if new.publication_status = 'published' and old.publication_status <> 'published' then
    new.published_at = coalesce(new.published_at, timezone('utc', now()));
  end if;
  return new;
end;
$$;

drop trigger if exists songs_touch_updated_at on public.songs;
create trigger songs_touch_updated_at before update on public.songs for each row execute function public.touch_updated_at();

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  description text,
  publication_status text not null default 'draft' check (publication_status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, name)
);

create index if not exists playlists_publication_idx on public.playlists (publication_status, created_at desc);

create table if not exists public.playlist_songs (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  position integer not null check (position >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (playlist_id, song_id),
  unique (playlist_id, position)
);

create index if not exists playlist_songs_song_idx on public.playlist_songs (song_id);

create table if not exists public.listening_sessions (
  id uuid primary key default gen_random_uuid(),
  session_key text not null unique check (length(session_key) between 20 and 160),
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_active_at timestamptz not null default timezone('utc', now()),
  device_category text not null default 'unknown' check (device_category in ('mobile', 'tablet', 'desktop', 'unknown'))
);

create index if not exists listening_sessions_active_idx on public.listening_sessions (last_active_at desc);

create table if not exists public.play_events (
  id uuid primary key default gen_random_uuid(),
  client_event_id uuid not null unique,
  session_id uuid not null references public.listening_sessions(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete restrict,
  event_type text not null check (event_type in ('playback_start', 'pause', 'resume', 'manual_skip', 'automatic_next', 'complete', 'heartbeat')),
  position_seconds integer check (position_seconds is null or position_seconds between 0 and 86400),
  listening_seconds integer check (listening_seconds is null or listening_seconds between 0 and 86400),
  occurred_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists play_events_song_time_idx on public.play_events (song_id, occurred_at desc);
create index if not exists play_events_type_time_idx on public.play_events (event_type, occurred_at desc);
create index if not exists play_events_session_time_idx on public.play_events (session_id, occurred_at desc);

create table if not exists public.daily_analytics (
  day date primary key,
  unique_visitors_estimate integer not null default 0 check (unique_visitors_estimate >= 0),
  playback_starts integer not null default 0 check (playback_starts >= 0),
  completed_plays integer not null default 0 check (completed_plays >= 0),
  listening_seconds integer not null default 0 check (listening_seconds >= 0),
  active_sessions_estimate integer not null default 0 check (active_sessions_estimate >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (length(trim(action)) between 1 and 100),
  entity_type text not null check (length(trim(entity_type)) between 1 and 80),
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_audit_log_time_idx on public.admin_audit_log (created_at desc);

alter table public.owner_authorizations enable row level security;
alter table public.songs enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.listening_sessions enable row level security;
alter table public.play_events enable row level security;
alter table public.daily_analytics enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists songs_public_read on public.songs;
create policy songs_public_read on public.songs for select to anon, authenticated using (publication_status = 'published');
drop policy if exists songs_owner_all on public.songs;
create policy songs_owner_all on public.songs for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists owner_authorizations_owner_read on public.owner_authorizations;
create policy owner_authorizations_owner_read on public.owner_authorizations for select to authenticated using (user_id = auth.uid());

drop policy if exists playlists_public_read on public.playlists;
create policy playlists_public_read on public.playlists for select to anon, authenticated using (publication_status = 'published');
drop policy if exists playlists_owner_all on public.playlists;
create policy playlists_owner_all on public.playlists for all to authenticated using (public.is_owner() and owner_id = auth.uid()) with check (public.is_owner() and owner_id = auth.uid());

drop policy if exists playlist_songs_public_read on public.playlist_songs;
create policy playlist_songs_public_read on public.playlist_songs for select to anon, authenticated using (exists (select 1 from public.playlists p where p.id = playlist_id and p.publication_status = 'published'));
drop policy if exists playlist_songs_owner_all on public.playlist_songs;
create policy playlist_songs_owner_all on public.playlist_songs for all to authenticated using (public.is_owner() and exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid())) with check (public.is_owner() and exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid()));

drop policy if exists listening_sessions_owner_read on public.listening_sessions;
create policy listening_sessions_owner_read on public.listening_sessions for select to authenticated using (public.is_owner());

drop policy if exists play_events_owner_read on public.play_events;
create policy play_events_owner_read on public.play_events for select to authenticated using (public.is_owner());

create or replace function public.ingest_listening_event(
  p_session_key text,
  p_client_event_id uuid,
  p_song_id uuid,
  p_event_type text,
  p_position_seconds integer default null,
  p_listening_seconds integer default null,
  p_device_category text default 'unknown'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_event_id uuid;
begin
  if length(coalesce(p_session_key, '')) not between 20 and 160 then raise exception 'invalid session key'; end if;
  if p_event_type not in ('playback_start', 'pause', 'resume', 'manual_skip', 'automatic_next', 'complete', 'heartbeat') then raise exception 'invalid event type'; end if;
  if p_position_seconds is not null and p_position_seconds not between 0 and 86400 then raise exception 'invalid position'; end if;
  if p_listening_seconds is not null and p_listening_seconds not between 0 and 86400 then raise exception 'invalid listening duration'; end if;
  if not exists (select 1 from public.songs where id = p_song_id and publication_status = 'published') then raise exception 'song is not published'; end if;

  insert into public.listening_sessions (session_key, device_category)
  values (p_session_key, case when p_device_category in ('mobile', 'tablet', 'desktop') then p_device_category else 'unknown' end)
  on conflict (session_key) do update set last_active_at = timezone('utc', now())
  returning id into v_session_id;

  insert into public.play_events (client_event_id, session_id, song_id, event_type, position_seconds, listening_seconds)
  values (p_client_event_id, v_session_id, p_song_id, p_event_type, p_position_seconds, p_listening_seconds)
  on conflict (client_event_id) do update set client_event_id = excluded.client_event_id
  returning id into v_event_id;
  return v_event_id;
end;
$$;

revoke all on function public.ingest_listening_event(text, uuid, uuid, text, integer, integer, text) from public;
grant execute on function public.ingest_listening_event(text, uuid, uuid, text, integer, integer, text) to anon, authenticated;

create or replace function public.refresh_daily_analytics()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then raise exception 'owner access required'; end if;
  insert into public.daily_analytics (day, unique_visitors_estimate, playback_starts, completed_plays, listening_seconds, active_sessions_estimate)
  select date(occurred_at), count(distinct session_id) filter (where event_type = 'playback_start'), count(*) filter (where event_type = 'playback_start'), count(*) filter (where event_type = 'complete'), coalesce(sum(listening_seconds) filter (where event_type in ('heartbeat', 'complete')), 0), (select count(*) from public.listening_sessions where last_active_at >= timezone('utc', now()) - interval '15 minutes')
  from public.play_events
  where occurred_at >= timezone('utc', now()) - interval '90 days'
  group by date(occurred_at)
  on conflict (day) do update set unique_visitors_estimate = excluded.unique_visitors_estimate, playback_starts = excluded.playback_starts, completed_plays = excluded.completed_plays, listening_seconds = excluded.listening_seconds, active_sessions_estimate = excluded.active_sessions_estimate, updated_at = timezone('utc', now());
end;
$$;

revoke all on function public.refresh_daily_analytics() from public;
grant execute on function public.refresh_daily_analytics() to authenticated;

drop policy if exists daily_analytics_owner_read on public.daily_analytics;
create policy daily_analytics_owner_read on public.daily_analytics for select to authenticated using (public.is_owner());
drop policy if exists admin_audit_owner_read on public.admin_audit_log;
create policy admin_audit_owner_read on public.admin_audit_log for select to authenticated using (public.is_owner());
drop policy if exists admin_audit_owner_insert on public.admin_audit_log;
create policy admin_audit_owner_insert on public.admin_audit_log for insert to authenticated with check (public.is_owner() and actor_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('yr-audio', 'yr-audio', false, 52428800, array['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav']),
  ('yr-artwork', 'yr-artwork', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists yr_audio_owner_write on storage.objects;
create policy yr_audio_owner_write on storage.objects for all to authenticated using (bucket_id = 'yr-audio' and public.is_owner() and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'yr-audio' and public.is_owner() and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists yr_artwork_owner_write on storage.objects;
create policy yr_artwork_owner_write on storage.objects for all to authenticated using (bucket_id = 'yr-artwork' and public.is_owner() and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'yr-artwork' and public.is_owner() and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists yr_audio_published_read on storage.objects;
create policy yr_audio_published_read on storage.objects for select to anon, authenticated using (bucket_id = 'yr-audio' and exists (select 1 from public.songs s where s.audio_path = name and s.publication_status = 'published'));
drop policy if exists yr_artwork_published_read on storage.objects;
create policy yr_artwork_published_read on storage.objects for select to anon, authenticated using (bucket_id = 'yr-artwork' and exists (select 1 from public.songs s where s.artwork_path = name and s.publication_status = 'published'));
