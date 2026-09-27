-- ============================================================
--  Hola Vecino — mise à jour v2
--  À exécuter APRÈS schema.sql : SQL Editor > New query > coller > Run
-- ============================================================

-- ---------- ADMINISTRATEURS ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
create policy "admins_self" on public.admins for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admins where user_id = auth.uid())
$$;

-- ---------- PROFILS : nouveaux champs ----------
alter table public.profiles
  add column if not exists verified boolean default false,
  add column if not exists is_guide boolean default false,
  add column if not exists avatar_url text,
  add column if not exists charter_accepted_at timestamptz;

-- Seul un administrateur peut attribuer le badge « vérifié »
create or replace function public.protect_verified() returns trigger
language plpgsql as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then new.verified := false; else new.verified := old.verified; end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_verified on public.profiles;
create trigger profiles_verified before insert or update on public.profiles
for each row execute function public.protect_verified();

create policy "profiles_admin_update" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "profiles_admin_delete" on public.profiles for delete to authenticated using (public.is_admin());

-- ---------- MODÉRATION ----------
create policy "threads_admin_delete" on public.forum_threads for delete to authenticated using (public.is_admin());
create policy "replies_admin_delete" on public.forum_replies for delete to authenticated using (public.is_admin());
create policy "contacts_admin_all"   on public.contacts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "reports_admin_read"   on public.reports for select to authenticated using (public.is_admin());
create policy "reports_admin_delete" on public.reports for delete to authenticated using (public.is_admin());

-- ---------- FORUM : groupes par ville ----------
alter table public.forum_threads add column if not exists city text;

-- ---------- BLOCAGE ----------
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
create policy "blocks_own_read"   on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "blocks_own_insert" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "blocks_own_delete" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and not public.is_blocked_between(sender_id, recipient_id));

-- ---------- LIMITE DE MESSAGES (anti-spam) ----------
-- 30 messages par jour pendant les 7 premiers jours, 200 ensuite
create or replace function public.message_rate_limit() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare n int; lim int; created timestamptz;
begin
  select created_at into created from auth.users where id = new.sender_id;
  lim := case when created > now() - interval '7 days' then 30 else 200 end;
  select count(*) into n from public.messages where sender_id = new.sender_id and created_at > now() - interval '1 day';
  if n >= lim then raise exception 'RATE_LIMIT'; end if;
  return new;
end $$;
drop trigger if exists messages_rate on public.messages;
create trigger messages_rate before insert on public.messages
for each row execute function public.message_rate_limit();

-- ---------- ÉVÉNEMENTS ----------
create table if not exists public.events (
  id bigint generated always as identity primary key,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  objective_type text not null,
  objective text not null check (char_length(objective) between 10 and 1000),
  description text check (char_length(description) <= 3000),
  city text not null,
  place_hint text check (char_length(place_hint) <= 120),
  starts_at timestamptz not null,
  ends_at timestamptz,
  max_participants int check (max_participants between 2 and 500),
  visibility text not null default 'public' check (visibility in ('public','invite')),
  audience jsonb default '{}'::jsonb,
  questions jsonb default '[]'::jsonb,
  cancelled boolean default false,
  created_at timestamptz default now()
);

-- Adresse exacte : visible seulement par l'organisateur et les participants confirmés
create table if not exists public.event_private (
  event_id bigint primary key references public.events(id) on delete cascade,
  address text check (char_length(address) <= 300)
);

create table if not exists public.event_rsvps (
  event_id bigint not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('invited','going','declined')),
  invited_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz default now(),
  primary key (event_id, user_id)
);

-- Réponses au questionnaire : visibles seulement par la personne et l'organisateur
create table if not exists public.event_answers (
  event_id bigint not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb default '{}'::jsonb,
  updated_at timestamptz default now(),
  primary key (event_id, user_id)
);

create or replace function public.event_creator(eid bigint) returns uuid
language sql stable security definer set search_path = public as $$ select creator_id from public.events where id = eid $$;
create or replace function public.event_is_public(eid bigint) returns boolean
language sql stable security definer set search_path = public as $$ select exists(select 1 from public.events where id = eid and visibility = 'public' and not cancelled) $$;
create or replace function public.has_rsvp(eid bigint) returns boolean
language sql stable security definer set search_path = public as $$ select exists(select 1 from public.event_rsvps where event_id = eid and user_id = auth.uid()) $$;
create or replace function public.is_going(eid bigint) returns boolean
language sql stable security definer set search_path = public as $$ select exists(select 1 from public.event_rsvps where event_id = eid and user_id = auth.uid() and status = 'going') $$;
create or replace function public.event_visible(eid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.events e where e.id = eid and (e.visibility = 'public' or e.creator_id = auth.uid()))
      or public.has_rsvp(eid)
$$;

alter table public.events        enable row level security;
alter table public.event_private enable row level security;
alter table public.event_rsvps   enable row level security;
alter table public.event_answers enable row level security;

create policy "events_read"   on public.events for select to authenticated
  using (visibility = 'public' or creator_id = auth.uid() or public.has_rsvp(id) or public.is_admin());
create policy "events_insert" on public.events for insert to authenticated with check (creator_id = auth.uid());
create policy "events_update" on public.events for update to authenticated using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy "events_delete" on public.events for delete to authenticated using (creator_id = auth.uid() or public.is_admin());

create policy "private_read"  on public.event_private for select to authenticated using (public.event_creator(event_id) = auth.uid() or public.is_going(event_id));
create policy "private_write" on public.event_private for all to authenticated using (public.event_creator(event_id) = auth.uid()) with check (public.event_creator(event_id) = auth.uid());

create policy "rsvps_read" on public.event_rsvps for select to authenticated
  using (user_id = auth.uid() or public.event_creator(event_id) = auth.uid() or (status = 'going' and public.event_visible(event_id)));
create policy "rsvps_insert" on public.event_rsvps for insert to authenticated with check (
  (user_id = auth.uid() and status in ('going','declined') and public.event_is_public(event_id))
  or (status = 'invited' and public.event_creator(event_id) = auth.uid() and user_id <> auth.uid()
      and not public.is_blocked_between(auth.uid(), user_id))
);
create policy "rsvps_update" on public.event_rsvps for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and status in ('going','declined'));
create policy "rsvps_delete" on public.event_rsvps for delete to authenticated
  using (user_id = auth.uid() or public.event_creator(event_id) = auth.uid());

create policy "answers_read"   on public.event_answers for select to authenticated using (user_id = auth.uid() or public.event_creator(event_id) = auth.uid());
create policy "answers_insert" on public.event_answers for insert to authenticated with check (user_id = auth.uid() and public.has_rsvp(event_id));
create policy "answers_update" on public.event_answers for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Nombre maximum de participants
create or replace function public.event_capacity() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int; n int;
begin
  if new.status = 'going' and (tg_op = 'INSERT' or old.status <> 'going') then
    select max_participants into cap from public.events where id = new.event_id;
    if cap is not null then
      select count(*) into n from public.event_rsvps where event_id = new.event_id and status = 'going';
      if n >= cap then raise exception 'EVENT_FULL'; end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists rsvps_capacity on public.event_rsvps;
create trigger rsvps_capacity before insert or update on public.event_rsvps
for each row execute function public.event_capacity();

-- ---------- NOTIFICATIONS ----------
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  ref text,
  actor_id uuid references public.profiles(id) on delete set null,
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "notif_read"   on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notif_delete" on public.notifications for delete to authenticated using (user_id = auth.uid());
create policy "notif_update" on public.notifications for update to authenticated using (user_id = auth.uid());
revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

create or replace function public.notify_reply() returns trigger
language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  select author_id into author from public.forum_threads where id = new.thread_id;
  if author is not null and author <> new.author_id then
    insert into public.notifications (user_id, type, ref, actor_id) values (author, 'reply', new.thread_id::text, new.author_id);
  end if;
  return new;
end $$;
drop trigger if exists replies_notify on public.forum_replies;
create trigger replies_notify after insert on public.forum_replies for each row execute function public.notify_reply();

create or replace function public.notify_rsvp() returns trigger
language plpgsql security definer set search_path = public as $$
declare creator uuid;
begin
  select creator_id into creator from public.events where id = new.event_id;
  if new.status = 'invited' and tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, ref, actor_id) values (new.user_id, 'invite', new.event_id::text, creator);
  elsif new.status = 'going' and (tg_op = 'INSERT' or old.status <> 'going') and creator <> new.user_id then
    insert into public.notifications (user_id, type, ref, actor_id) values (creator, 'rsvp', new.event_id::text, new.user_id);
  end if;
  return new;
end $$;
drop trigger if exists rsvps_notify on public.event_rsvps;
create trigger rsvps_notify after insert or update on public.event_rsvps for each row execute function public.notify_rsvp();

alter publication supabase_realtime add table public.notifications;

-- ---------- PHOTOS DE PROFIL (Supabase Storage, 1 Go gratuit) ----------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
create policy "avatars_read"   on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_insert" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_delete" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
