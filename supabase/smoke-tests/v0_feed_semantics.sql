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
values
  (
    '00000000-0000-4000-8000-000000000101',
    'authenticated',
    'authenticated',
    'feed-a@example.edu',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'authenticated',
    'authenticated',
    'feed-b@example.edu',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    'authenticated',
    'authenticated',
    'feed-c@example.edu',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now()
  );

insert into public.beta_access (email, approved_at)
values
  ('feed-a@example.edu', now()),
  ('feed-b@example.edu', now()),
  ('feed-c@example.edu', now());

insert into public.profiles (id, name, username)
values
  ('00000000-0000-4000-8000-000000000101', 'Feed User A', 'feed_user_a'),
  ('00000000-0000-4000-8000-000000000102', 'Feed User B', 'feed_user_b'),
  ('00000000-0000-4000-8000-000000000103', 'Feed User C', 'feed_user_c');

insert into public.papers (id, title, source_type, canonical_key)
values
  (
    '10000000-0000-4000-8000-000000000101',
    'Feed Paper One',
    'manual',
    'title_year:feed paper one:2026'
  ),
  (
    '10000000-0000-4000-8000-000000000102',
    'Feed Paper Two',
    'manual',
    'title_year:feed paper two:2026'
  ),
  (
    '10000000-0000-4000-8000-000000000103',
    'Feed Paper Three',
    'manual',
    'title_year:feed paper three:2026'
  ),
  (
    '10000000-0000-4000-8000-000000000104',
    'Unfollowed Feed Paper',
    'manual',
    'title_year:unfollowed feed paper:2026'
  );

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
values
  (
    '20000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000102',
    '10000000-0000-4000-8000-000000000101',
    'reading',
    'web',
    '2026-06-01T00:00:00Z',
    '2026-06-02T00:00:00Z',
    null,
    null,
    null,
    null
  ),
  (
    '20000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000102',
    '10000000-0000-4000-8000-000000000102',
    'read',
    'web',
    '2026-06-01T00:00:00Z',
    '2026-06-02T00:00:00Z',
    'worth_reading',
    '2026-06-02T00:00:00Z',
    null,
    null
  ),
  (
    '20000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000102',
    '10000000-0000-4000-8000-000000000103',
    'deep_read',
    'web',
    '2026-06-01T00:00:00Z',
    '2026-06-03T00:00:00Z',
    null,
    null,
    'Visible context',
    '2026-06-03T00:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000104',
    '00000000-0000-4000-8000-000000000103',
    '10000000-0000-4000-8000-000000000104',
    'skipped',
    'web',
    '2026-06-01T00:00:00Z',
    '2026-06-04T00:00:00Z',
    'unsure',
    '2026-06-04T00:00:00Z',
    null,
    null
  );

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000101';
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000101","email":"feed-a@example.edu","role":"authenticated"}';

do $$
begin
  if exists (
    select 1
    from public.user_papers
    where user_id = '00000000-0000-4000-8000-000000000102'
  ) then
    raise exception 'unfollowed user-paper activity is visible';
  end if;
end;
$$;

insert into public.follows (follower_user_id, followed_user_id)
values (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102'
);

do $$
declare
  visible_ids text[];
begin
  select array_agg(id::text order by latest_visible_at desc, id desc)
  into visible_ids
  from public.user_papers
  where user_id = '00000000-0000-4000-8000-000000000102';

  if visible_ids <> array[
    '20000000-0000-4000-8000-000000000103',
    '20000000-0000-4000-8000-000000000102',
    '20000000-0000-4000-8000-000000000101'
  ] then
    raise exception 'feed ordering is not latest_visible_at desc, id desc: %', visible_ids;
  end if;

  if exists (
    select 1
    from public.user_papers
    where user_id = '00000000-0000-4000-8000-000000000103'
  ) then
    raise exception 'unfollowed beta user activity is visible after following someone else';
  end if;
end;
$$;

reset role;

do $$
declare
  before_note_update timestamptz;
  after_note_update timestamptz;
begin
  select latest_visible_at
  into before_note_update
  from public.user_papers
  where id = '20000000-0000-4000-8000-000000000103';

  insert into public.private_notes (user_id, paper_id, body)
  values (
    '00000000-0000-4000-8000-000000000102',
    '10000000-0000-4000-8000-000000000103',
    'private feed note'
  );

  update public.private_notes
  set body = 'private feed note edited'
  where user_id = '00000000-0000-4000-8000-000000000102'
    and paper_id = '10000000-0000-4000-8000-000000000103';

  select latest_visible_at
  into after_note_update
  from public.user_papers
  where id = '20000000-0000-4000-8000-000000000103';

  if before_note_update <> after_note_update then
    raise exception 'private note edit changed latest_visible_at';
  end if;
end;
$$;

update public.user_papers
set
  visible_comment = 'Visible context updated',
  comment_updated_at = '2026-06-05T00:00:00Z'
where id = '20000000-0000-4000-8000-000000000101';

do $$
begin
  if (
    select latest_visible_at
    from public.user_papers
    where id = '20000000-0000-4000-8000-000000000101'
  ) <> '2026-06-05T00:00:00Z'::timestamptz then
    raise exception 'visible comment update did not advance latest_visible_at';
  end if;
end;
$$;

update public.user_papers
set removed_at = now()
where id = '20000000-0000-4000-8000-000000000103';

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000101';
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000101","email":"feed-a@example.edu","role":"authenticated"}';

do $$
begin
  if exists (
    select 1
    from public.user_papers
    where id = '20000000-0000-4000-8000-000000000103'
  ) then
    raise exception 'removed followed user-paper is still visible';
  end if;
end;
$$;

delete from public.follows
where follower_user_id = '00000000-0000-4000-8000-000000000101'
  and followed_user_id = '00000000-0000-4000-8000-000000000102';

do $$
begin
  if exists (
    select 1
    from public.user_papers
    where user_id = '00000000-0000-4000-8000-000000000102'
  ) then
    raise exception 'unfollow did not remove feed visibility';
  end if;
end;
$$;

rollback;
