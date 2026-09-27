-- ============================================================
--  Hola Vecino — mise à jour v4 : engagement à long terme
--  À exécuter APRÈS migration-v3.sql
-- ============================================================

-- Statistiques d'entraide d'un membre (réponses, sujets, événements, idées réalisées)
create or replace function public.member_stats(uid uuid)
returns table (replies int, threads int, events_organized int, events_attended int, ideas_done int)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.forum_replies where author_id = uid)::int,
    (select count(*) from public.forum_threads where author_id = uid)::int,
    (select count(*) from public.events where creator_id = uid and not cancelled and starts_at < now())::int,
    (select count(*) from public.event_rsvps r join public.events e on e.id = r.event_id
       where r.user_id = uid and r.status = 'going' and e.starts_at < now() and not e.cancelled)::int,
    (select count(*) from public.suggestions where author_id = uid and status = 'done')::int
$$;
revoke all on function public.member_stats(uuid) from public, anon;
grant execute on function public.member_stats(uuid) to authenticated;

-- Classement des membres les plus serviables d'une ville (tableau de bord)
create or replace function public.top_helpers(p_city text, p_limit int default 5)
returns table (id uuid, display_name text, avatar_url text, points int)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_url,
    ((select count(*) from public.forum_replies r where r.author_id = p.id and r.created_at > now() - interval '90 days') * 2
     + (select count(*) from public.events e where e.creator_id = p.id and not e.cancelled and e.starts_at > now() - interval '90 days') * 10)::int as points
  from public.profiles p
  where p_city is null or p.city ilike p_city
  order by points desc
  limit least(p_limit, 20)
$$;
revoke all on function public.top_helpers(text, int) from public, anon;
grant execute on function public.top_helpers(text, int) to authenticated;
