-- ============================================================
--  Hola Vecino — mise à jour v3 : Premium, annonces payantes, suggestions
--  À exécuter APRÈS schema.sql puis migration-v2.sql
-- ============================================================

-- ---------- PREMIUM ----------
alter table public.profiles add column if not exists premium_until timestamptz;

-- premium_until ne peut être modifié que par le site lui-même (paiement) ou un administrateur
create or replace function public.protect_premium() returns trigger
language plpgsql as $$
begin
  if not (public.is_admin() or current_user in ('postgres', 'service_role', 'supabase_admin')) then
    if tg_op = 'INSERT' then new.premium_until := null; else new.premium_until := old.premium_until; end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_premium on public.profiles;
create trigger profiles_premium before insert or update on public.profiles
for each row execute function public.protect_premium();

create or replace function public.is_premium() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists(select 1 from public.profiles where id = auth.uid() and premium_until > now())
$$;
grant execute on function public.is_premium() to authenticated;

-- Créer un événement : réservé aux membres Premium (s'inscrire reste gratuit)
drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events for insert to authenticated
  with check (creator_id = auth.uid() and public.is_premium());

-- ---------- CRÉDITS ACHETÉS (écrits par le webhook Gumroad) ----------
-- kind : premium | pro | youtube | rental | featured ; days : durée achetée
create table if not exists public.credits (
  id bigint generated always as identity primary key,
  email text not null,
  kind text not null check (kind in ('premium','pro','youtube','rental','featured')),
  days int not null check (days > 0),
  sale_id text unique,
  amount_cents int,
  used_at timestamptz,
  used_for text,
  created_at timestamptz default now()
);
create index if not exists credits_email_idx on public.credits (lower(email));
alter table public.credits enable row level security;
create policy "credits_own_read" on public.credits for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) or public.is_admin());
create policy "credits_admin_all" on public.credits for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Applique automatiquement les achats Premium à la connexion
create or replace function public.claim_premium() returns timestamptz
language plpgsql security definer set search_path = public, auth as $$
declare u_email text; c record; until timestamptz;
begin
  if auth.uid() is null then return null; end if;
  select email into u_email from auth.users where id = auth.uid();
  select premium_until into until from public.profiles where id = auth.uid();
  if not found then return null; end if;
  for c in select * from public.credits where lower(email) = lower(u_email) and kind = 'premium' and used_at is null order by created_at for update loop
    until := greatest(coalesce(until, now()), now()) + make_interval(days => c.days);
    update public.credits set used_at = now(), used_for = 'profile:' || auth.uid() where id = c.id;
  end loop;
  update public.profiles set premium_until = until where id = auth.uid();
  return until;
end $$;
grant execute on function public.claim_premium() to authenticated;

-- ---------- ANNONCES (restaurants, hôtels, services, locations, chaînes YouTube) ----------
create table if not exists public.listings (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('restaurant','hotel','service','rental','youtube')),
  title text not null check (char_length(title) between 3 and 120),
  description text check (char_length(description) <= 2000),
  city text,
  address text check (char_length(address) <= 200),
  phone text, email text, website text,
  youtube_url text,
  topics text[] default '{}',
  languages text[] default '{}',
  price_text text check (char_length(price_text) <= 120),
  licence_number text check (char_length(licence_number) <= 80),
  status text not null default 'draft' check (status in ('draft','active','rejected')),
  active_until timestamptz,
  featured_until timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists listings_kind_idx on public.listings (kind, status, active_until);

-- Statut et dates : seulement via paiement (fonction) ou administrateur
create or replace function public.protect_listing() returns trigger
language plpgsql as $$
begin
  if not (public.is_admin() or current_user in ('postgres', 'service_role', 'supabase_admin')) then
    if tg_op = 'INSERT' then
      new.status := 'draft'; new.active_until := null; new.featured_until := null;
    else
      new.status := old.status; new.active_until := old.active_until; new.featured_until := old.featured_until;
    end if;
  end if;
  if new.kind = 'rental' and coalesce(trim(new.licence_number), '') = '' then
    raise exception 'LICENCE_REQUIRED';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists listings_protect on public.listings;
create trigger listings_protect before insert or update on public.listings
for each row execute function public.protect_listing();

alter table public.listings enable row level security;
create policy "listings_public_read" on public.listings for select to anon, authenticated
  using ((status = 'active' and active_until > now()) or owner_id = auth.uid() or public.is_admin());
create policy "listings_insert" on public.listings for insert to authenticated with check (owner_id = auth.uid());
create policy "listings_update" on public.listings for update to authenticated using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "listings_delete" on public.listings for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

-- Activer ou prolonger une annonce avec un crédit acheté
create or replace function public.activate_listing(p_listing bigint, p_featured boolean default false) returns timestamptz
language plpgsql security definer set search_path = public, auth as $$
declare l record; u_email text; want text; c record; until timestamptz;
begin
  select * into l from public.listings where id = p_listing and owner_id = auth.uid() for update;
  if not found then raise exception 'NOT_OWNER'; end if;
  if l.status = 'rejected' then raise exception 'REJECTED'; end if;
  select email into u_email from auth.users where id = auth.uid();
  want := case when p_featured then 'featured' when l.kind in ('restaurant','hotel','service') then 'pro' else l.kind end;
  select * into c from public.credits where lower(email) = lower(u_email) and kind = want and used_at is null order by created_at limit 1 for update;
  if not found then raise exception 'NO_CREDIT'; end if;
  update public.credits set used_at = now(), used_for = 'listing:' || p_listing where id = c.id;
  if p_featured then
    until := greatest(coalesce(l.featured_until, now()), now()) + make_interval(days => c.days);
    update public.listings set featured_until = until where id = p_listing;
  else
    until := greatest(coalesce(l.active_until, now()), now()) + make_interval(days => c.days);
    update public.listings set active_until = until, status = 'active' where id = p_listing;
  end if;
  return until;
end $$;
grant execute on function public.activate_listing(bigint, boolean) to authenticated;

-- ---------- SUGGESTIONS ----------
create table if not exists public.suggestions (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  body text check (char_length(body) <= 2000),
  status text not null default 'new' check (status in ('new','planned','done','declined')),
  created_at timestamptz default now()
);
create table if not exists public.suggestion_votes (
  suggestion_id bigint not null references public.suggestions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (suggestion_id, user_id)
);
create or replace function public.protect_suggestion() returns trigger
language plpgsql as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then new.status := 'new'; else new.status := old.status; end if;
  end if;
  return new;
end $$;
drop trigger if exists suggestions_protect on public.suggestions;
create trigger suggestions_protect before insert or update on public.suggestions
for each row execute function public.protect_suggestion();

alter table public.suggestions enable row level security;
alter table public.suggestion_votes enable row level security;
create policy "sugg_read"   on public.suggestions for select to authenticated using (true);
create policy "sugg_insert" on public.suggestions for insert to authenticated with check (author_id = auth.uid());
create policy "sugg_update" on public.suggestions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "sugg_delete" on public.suggestions for delete to authenticated using (author_id = auth.uid() or public.is_admin());
create policy "votes_read"   on public.suggestion_votes for select to authenticated using (true);
create policy "votes_insert" on public.suggestion_votes for insert to authenticated with check (user_id = auth.uid());
create policy "votes_delete" on public.suggestion_votes for delete to authenticated using (user_id = auth.uid());

-- Signalements : les annonces peuvent aussi être signalées
-- (target_type = 'listing', géré par l'espace administrateur)
