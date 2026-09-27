-- ============================================================
--  Hola Vecino — schéma Supabase
--  À coller en une fois dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- ---------- PROFILS ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  age int check (age between 16 and 110),
  gender text,
  nationality text,
  origin_country text,
  languages text[] default '{}',
  city text,
  region text,
  lat double precision,
  lng double precision,
  show_on_map boolean default false,
  status text,
  arrival_date date,
  family text,
  children int default 0 check (children between 0 and 20),
  pets boolean default false,
  profession text,
  work_situation text,
  looking_for text[] default '{}',
  housing text,
  spanish_level text,
  interests text check (char_length(interests) <= 500),
  bio text check (char_length(bio) <= 1500),
  guide_progress jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Protection de la vie privée : position arrondie (~1 km) et effacée si la personne ne veut pas être sur la carte
create or replace function public.profiles_before_write() returns trigger
language plpgsql as $$
begin
  if new.show_on_map is not true then
    new.lat := null; new.lng := null;
  else
    new.lat := round(new.lat::numeric, 2)::double precision;
    new.lng := round(new.lng::numeric, 2)::double precision;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_bw before insert or update on public.profiles
for each row execute function public.profiles_before_write();

-- ---------- FORUM ----------
create table public.forum_threads (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  title text not null check (char_length(title) between 3 and 140),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz default now(),
  last_activity timestamptz default now()
);

create table public.forum_replies (
  id bigint generated always as identity primary key,
  thread_id bigint not null references public.forum_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz default now()
);

create or replace function public.bump_thread() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.forum_threads set last_activity = now() where id = new.thread_id;
  return new;
end $$;

create trigger replies_bump after insert on public.forum_replies
for each row execute function public.bump_thread();

-- ---------- MESSAGERIE PRIVÉE ----------
create table public.messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  read boolean default false,
  created_at timestamptz default now(),
  check (sender_id <> recipient_id)
);
create index messages_recipient_idx on public.messages (recipient_id, created_at);
create index messages_sender_idx on public.messages (sender_id, created_at);

-- ---------- CONTACTS UTILES (validés par vous) ----------
create table public.contacts (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 120),
  category text not null,
  city text,
  languages text[] default '{}',
  phone text,
  email text,
  website text,
  address text,
  description text check (char_length(description) <= 1000),
  approved boolean default false,
  submitted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ---------- SIGNALEMENTS (lus par vous dans le tableau de bord) ----------
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  reason text check (char_length(reason) <= 1000),
  created_at timestamptz default now()
);

-- ============================================================
--  SÉCURITÉ (Row Level Security)
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_replies enable row level security;
alter table public.messages      enable row level security;
alter table public.contacts      enable row level security;
alter table public.reports       enable row level security;

-- Profils : visibles uniquement par les membres connectés ; chacun ne modifie que le sien
create policy "profiles_read"   on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_delete" on public.profiles for delete to authenticated using (id = auth.uid());

-- Forum : membres connectés
create policy "threads_read"   on public.forum_threads for select to authenticated using (true);
create policy "threads_insert" on public.forum_threads for insert to authenticated with check (author_id = auth.uid());
create policy "threads_delete" on public.forum_threads for delete to authenticated using (author_id = auth.uid());
create policy "replies_read"   on public.forum_replies for select to authenticated using (true);
create policy "replies_insert" on public.forum_replies for insert to authenticated with check (author_id = auth.uid());
create policy "replies_delete" on public.forum_replies for delete to authenticated using (author_id = auth.uid());

-- Messages : lisibles uniquement par l'expéditeur et le destinataire
create policy "messages_read"   on public.messages for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "messages_insert" on public.messages for insert to authenticated with check (sender_id = auth.uid());
create policy "messages_mark_read" on public.messages for update to authenticated using (recipient_id = auth.uid());
revoke update on public.messages from authenticated;
grant update (read) on public.messages to authenticated;

-- Contacts : tout le monde voit les contacts validés ; les membres proposent, vous validez
create policy "contacts_read"   on public.contacts for select to anon, authenticated using (approved = true or submitted_by = auth.uid());
create policy "contacts_insert" on public.contacts for insert to authenticated with check (submitted_by = auth.uid() and approved = false);

-- Signalements : les membres envoient, seul vous (tableau de bord) lisez
create policy "reports_insert" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

-- Suppression complète de son compte (RGPD)
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Messagerie en temps réel
alter publication supabase_realtime add table public.messages;
