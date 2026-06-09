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
values (
  '00000000-0000-4000-8000-000000000301',
  'authenticated',
  'authenticated',
  'analytics-a@example.edu',
  crypt('password', gen_salt('bf')),
  now(),
  now(),
  now()
);

insert into public.beta_access (email, approved_at)
values ('analytics-a@example.edu', now());

insert into public.profiles (id, name, username)
values (
  '00000000-0000-4000-8000-000000000301',
  'Analytics User A',
  'analytics_user_a'
);

insert into public.analytics_events (
  user_id,
  event_name,
  entity_type,
  metadata
)
values
  (
    '00000000-0000-4000-8000-000000000301',
    'paper_added',
    'paper',
    '{"addedVia":"web"}'
  ),
  (
    '00000000-0000-4000-8000-000000000301',
    'paper_removed',
    'paper',
    '{}'
  ),
  (
    '00000000-0000-4000-8000-000000000301',
    'paper_added_from_extension',
    'paper',
    '{}'
  ),
  (
    '00000000-0000-4000-8000-000000000301',
    'paper_added_from_web',
    'paper',
    '{}'
  ),
  (
    '00000000-0000-4000-8000-000000000301',
    'reading_state_updated',
    'user_paper',
    '{}'
  ),
  (
    '00000000-0000-4000-8000-000000000301',
    'recommendation_signal_set',
    'user_paper',
    '{}'
  ),
  (
    '00000000-0000-4000-8000-000000000301',
    'visible_comment_created',
    'user_paper',
    '{}'
  ),
  (
    '00000000-0000-4000-8000-000000000301',
    'private_note_created',
    'private_note',
    '{}'
  ),
  (
    '00000000-0000-4000-8000-000000000301',
    'follow_created',
    'profile',
    '{}'
  ),
  (
    '00000000-0000-4000-8000-000000000301',
    'following_feed_viewed',
    'feed',
    '{"itemCount":0}'
  ),
  (
    '00000000-0000-4000-8000-000000000301',
    'extension_connected',
    'extension_session',
    '{}'
  ),
  (
    '00000000-0000-4000-8000-000000000301',
    'metadata_resolution_failed',
    'paper_input',
    '{"sourceType":"unknown"}'
  );

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000301';
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000301","email":"analytics-a@example.edu","role":"authenticated"}';

do $$
begin
  if (select count(*) from public.analytics_events) <> 0 then
    raise exception 'authenticated clients can read analytics events directly';
  end if;
end;
$$;

reset role;

do $$
declare
  expected_events text[] := array[
    'paper_added',
    'paper_removed',
    'paper_added_from_extension',
    'paper_added_from_web',
    'reading_state_updated',
    'recommendation_signal_set',
    'visible_comment_created',
    'private_note_created',
    'follow_created',
    'following_feed_viewed',
    'extension_connected',
    'metadata_resolution_failed'
  ];
  actual_events text[];
begin
  select array_agg(distinct event_name::text order by event_name::text)
  into actual_events
  from public.analytics_events;

  if actual_events <> (
    select array_agg(event_name order by event_name)
    from unnest(expected_events) as event_name
  ) then
    raise exception 'analytics event enum coverage mismatch: %', actual_events;
  end if;

  if exists (
    select 1
    from public.analytics_events
    where event_name = 'private_note_created'
      and metadata <> '{}'::jsonb
  ) then
    raise exception 'private note analytics event contains metadata';
  end if;
end;
$$;

rollback;
