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
    '00000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'a@example.edu',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'b@example.edu',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now()
  );

insert into public.beta_access (email, approved_at)
values
  ('a@example.edu', now()),
  ('b@example.edu', now());

insert into public.profiles (id, name, username)
values
  ('00000000-0000-4000-8000-000000000001', 'User A', 'user_a'),
  ('00000000-0000-4000-8000-000000000002', 'User B', 'user_b');

insert into public.papers (id, title, source_type, arxiv_id, canonical_key)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Surviving Paper',
    'arxiv',
    '2501.00001',
    'arxiv:2501.00001'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Duplicate Paper',
    'manual',
    null,
    'title_year:duplicate paper:2026'
  );

insert into public.user_papers (
  id,
  user_id,
  paper_id,
  reading_state,
  added_via,
  state_updated_at,
  recommendation_signal,
  signal_updated_at,
  visible_comment,
  comment_updated_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'reading',
    'web',
    '2026-06-01T00:00:00Z',
    null,
    null,
    null,
    null
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'deep_read',
    'web',
    '2026-06-02T00:00:00Z',
    'worth_reading',
    '2026-06-02T00:00:00Z',
    'Visible signal',
    '2026-06-02T00:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'read',
    'manual',
    '2026-06-03T00:00:00Z',
    'useful_reference',
    '2026-06-03T00:00:00Z',
    'Duplicate visible signal',
    '2026-06-03T00:00:00Z'
  );

insert into public.private_notes (id, user_id, paper_id, body)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'private note a'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'private note b'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'duplicate private note a'
  );

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","email":"a@example.edu","role":"authenticated"}';

do $$
begin
  if (select count(*) from public.private_notes) <> 2 then
    raise exception 'expected user A to see only own active private notes before follow';
  end if;

  if exists (select 1 from public.private_notes where body = 'private note b') then
    raise exception 'user A can see user B private note before follow';
  end if;

  if (select count(*) from public.user_papers) <> 2 then
    raise exception 'expected user A to see only own user papers before follow';
  end if;
end;
$$;

insert into public.follows (follower_user_id, followed_user_id)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002'
);

do $$
begin
  if (select count(*) from public.user_papers) <> 3 then
    raise exception 'expected user A to see followed user paper after follow';
  end if;

  if (select count(*) from public.private_notes) <> 2 then
    raise exception 'expected private note visibility to remain own-only after follow';
  end if;

  if exists (select 1 from public.private_notes where body = 'private note b') then
    raise exception 'user A can see user B private note after follow';
  end if;
end;
$$;

reset role;

select public.merge_duplicate_papers(
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'
);

do $$
declare
  merged_user_paper record;
  merged_note record;
begin
  select *
  into merged_user_paper
  from public.user_papers
  where id = '20000000-0000-4000-8000-000000000001';

  if merged_user_paper.reading_state <> 'read' then
    raise exception 'merge did not preserve most recently updated reading state';
  end if;

  if merged_user_paper.recommendation_signal <> 'useful_reference' then
    raise exception 'merge did not preserve most recently updated recommendation signal';
  end if;

  if merged_user_paper.visible_comment <> 'Duplicate visible signal' then
    raise exception 'merge did not preserve most recently updated visible comment';
  end if;

  if not exists (
    select 1
    from public.user_papers
    where id = '20000000-0000-4000-8000-000000000003'
      and removed_at is not null
  ) then
    raise exception 'duplicate user-paper was not removed during merge';
  end if;

  select *
  into merged_note
  from public.private_notes
  where id = '30000000-0000-4000-8000-000000000001';

  if merged_note.body not like '%private note a%'
     or merged_note.body not like '%duplicate private note a%' then
    raise exception 'merge did not preserve both private note bodies';
  end if;

  if not exists (
    select 1
    from public.paper_merges
    where duplicate_paper_id = '10000000-0000-4000-8000-000000000002'
      and surviving_paper_id = '10000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'merge record missing';
  end if;

  if not exists (
    select 1
    from public.papers
    where id = '10000000-0000-4000-8000-000000000002'
      and duplicate_of_paper_id = '10000000-0000-4000-8000-000000000001'
      and deleted_at is not null
  ) then
    raise exception 'duplicate paper was not soft-hidden';
  end if;
end;
$$;

rollback;
