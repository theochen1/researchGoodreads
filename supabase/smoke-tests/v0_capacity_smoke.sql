begin;

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
select
  ('00000000-0000-4000-8000-' || lpad((900 + i)::text, 12, '0'))::uuid,
  'authenticated',
  'authenticated',
  'capacity-' || i || '@example.edu',
  crypt('password', gen_salt('bf')),
  now(),
  now(),
  now()
from generate_series(1, 101) as seeded(i);

insert into public.beta_access (email, approved_at)
select 'capacity-' || i || '@example.edu', now()
from generate_series(1, 101) as seeded(i);

insert into public.profiles (id, name, username)
select
  ('00000000-0000-4000-8000-' || lpad((900 + i)::text, 12, '0'))::uuid,
  'Capacity User ' || i,
  'capacity_user_' || i
from generate_series(1, 101) as seeded(i);

insert into public.papers (
  id,
  title,
  source_type,
  canonical_key,
  year
)
select
  ('10000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'Capacity Feed Paper ' || i,
  'manual',
  'title_year:capacity feed paper ' || i || ':2026',
  2026
from generate_series(1, 100) as seeded(i);

insert into public.user_papers (
  id,
  user_id,
  paper_id,
  reading_state,
  added_via,
  added_at,
  state_updated_at,
  recommendation_signal,
  signal_updated_at,
  visible_comment,
  comment_updated_at
)
select
  ('20000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  ('00000000-0000-4000-8000-' || lpad((901 + i)::text, 12, '0'))::uuid,
  ('10000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  case
    when i % 5 = 0 then 'deep_read'
    when i % 3 = 0 then 'read'
    else 'reading'
  end::public.reading_state,
  'web',
  '2026-06-01T00:00:00Z'::timestamptz + (i || ' minutes')::interval,
  '2026-06-02T00:00:00Z'::timestamptz + (i || ' minutes')::interval,
  case
    when i % 4 = 0 then 'worth_reading'::public.recommendation_signal
    else null
  end,
  case
    when i % 4 = 0 then '2026-06-03T00:00:00Z'::timestamptz + (i || ' minutes')::interval
    else null
  end,
  case
    when i % 6 = 0 then 'Capacity visible comment ' || i
    else null
  end,
  case
    when i % 6 = 0 then '2026-06-04T00:00:00Z'::timestamptz + (i || ' minutes')::interval
    else null
  end
from generate_series(1, 100) as seeded(i);

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000901';
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000901","email":"capacity-1@example.edu","role":"authenticated"}';

insert into public.follows (follower_user_id, followed_user_id)
select
  '00000000-0000-4000-8000-000000000901'::uuid,
  ('00000000-0000-4000-8000-' || lpad((901 + i)::text, 12, '0'))::uuid
from generate_series(1, 100) as seeded(i);

do $$
declare
  visible_count integer;
  limited_count integer;
  first_visible_at timestamptz;
  last_visible_at timestamptz;
begin
  select count(*)
  into visible_count
  from public.user_papers
  where removed_at is null;

  if visible_count <> 100 then
    raise exception '100-follow capacity feed expected 100 visible rows, got %', visible_count;
  end if;

  with feed_page as (
    select id, latest_visible_at
    from public.user_papers
    where removed_at is null
    order by latest_visible_at desc, id desc
    limit 101
  )
  select count(*), max(latest_visible_at), min(latest_visible_at)
  into limited_count, first_visible_at, last_visible_at
  from feed_page;

  if limited_count <> 100 then
    raise exception 'bounded capacity feed query expected 100 rows, got %', limited_count;
  end if;

  if first_visible_at <= last_visible_at then
    raise exception 'capacity feed timestamps are not ordered from newest to oldest';
  end if;

  if exists (
    with feed_page as (
      select
        id,
        latest_visible_at,
        lag(latest_visible_at) over (order by latest_visible_at desc, id desc) as previous_visible_at
      from public.user_papers
      where removed_at is null
      order by latest_visible_at desc, id desc
      limit 101
    )
    select 1
    from feed_page
    where previous_visible_at is not null
      and latest_visible_at > previous_visible_at
  ) then
    raise exception 'capacity feed is not stable by latest_visible_at desc, id desc';
  end if;
end;
$$;

delete from public.follows
where follower_user_id = '00000000-0000-4000-8000-000000000901';

do $$
begin
  if exists (
    select 1
    from public.user_papers
    where removed_at is null
  ) then
    raise exception 'capacity feed visibility remained after unfollowing all users';
  end if;
end;
$$;

rollback;
