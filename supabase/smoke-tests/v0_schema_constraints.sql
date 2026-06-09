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
  '00000000-0000-4000-8000-000000000401',
  'authenticated',
  'authenticated',
  'schema-a@example.edu',
  crypt('password', gen_salt('bf')),
  now(),
  now(),
  now()
);

insert into public.beta_access (email, approved_at)
values ('schema-a@example.edu', now());

insert into public.profiles (id, name, username)
values (
  '00000000-0000-4000-8000-000000000401',
  'Schema User A',
  'schema_user_a'
);

insert into public.papers (
  id,
  title,
  source_type,
  canonical_key,
  doi,
  arxiv_id,
  canonical_url
)
values (
  '10000000-0000-4000-8000-000000000401',
  'Schema Paper',
  'doi',
  'doi:10.1145/schema',
  '10.1145/schema',
  '2601.00001',
  'https://doi.org/10.1145/schema'
);

do $$
declare
  blocked boolean;
begin
  blocked := false;
  begin
    insert into public.papers (title, source_type, doi)
    values ('Duplicate DOI Paper', 'doi', '10.1145/SCHEMA');
  exception when unique_violation then
    blocked := true;
  end;

  if not blocked then
    raise exception 'duplicate DOI was not blocked';
  end if;

  blocked := false;
  begin
    insert into public.papers (title, source_type, arxiv_id)
    values ('Duplicate arXiv Paper', 'arxiv', '2601.00001');
  exception when unique_violation then
    blocked := true;
  end;

  if not blocked then
    raise exception 'duplicate arXiv ID was not blocked';
  end if;

  blocked := false;
  begin
    insert into public.papers (title, source_type, canonical_url)
    values ('Duplicate URL Paper', 'manual', 'HTTPS://DOI.ORG/10.1145/SCHEMA');
  exception when unique_violation then
    blocked := true;
  end;

  if not blocked then
    raise exception 'duplicate canonical URL was not blocked';
  end if;
end;
$$;

insert into public.user_papers (
  id,
  user_id,
  paper_id,
  reading_state,
  added_via
)
values (
  '20000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000401',
  '10000000-0000-4000-8000-000000000401',
  'want_to_read',
  'web'
);

do $$
declare
  blocked boolean;
begin
  blocked := false;
  begin
    insert into public.user_papers (
      user_id,
      paper_id,
      reading_state,
      added_via
    )
    values (
      '00000000-0000-4000-8000-000000000401',
      '10000000-0000-4000-8000-000000000401',
      'reading',
      'web'
    );
  exception when unique_violation then
    blocked := true;
  end;

  if not blocked then
    raise exception 'duplicate active user-paper pair was not blocked';
  end if;

  blocked := false;
  begin
    update public.user_papers
    set visible_comment = repeat('x', 1001)
    where id = '20000000-0000-4000-8000-000000000401';
  exception when check_violation then
    blocked := true;
  end;

  if not blocked then
    raise exception 'visible comment over 1000 characters was not blocked';
  end if;
end;
$$;

insert into public.private_notes (
  id,
  user_id,
  paper_id,
  body
)
values (
  '30000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000401',
  '10000000-0000-4000-8000-000000000401',
  'schema note'
);

do $$
declare
  blocked boolean;
begin
  blocked := false;
  begin
    insert into public.private_notes (user_id, paper_id, body)
    values (
      '00000000-0000-4000-8000-000000000401',
      '10000000-0000-4000-8000-000000000401',
      'duplicate active note'
    );
  exception when unique_violation then
    blocked := true;
  end;

  if not blocked then
    raise exception 'duplicate active private note was not blocked';
  end if;
end;
$$;

update public.private_notes
set archived_at = now()
where id = '30000000-0000-4000-8000-000000000401';

insert into public.private_notes (user_id, paper_id, body)
values (
  '00000000-0000-4000-8000-000000000401',
  '10000000-0000-4000-8000-000000000401',
  'replacement note after archive'
);

update public.user_papers
set removed_at = now()
where id = '20000000-0000-4000-8000-000000000401';

insert into public.user_papers (
  user_id,
  paper_id,
  reading_state,
  added_via
)
values (
  '00000000-0000-4000-8000-000000000401',
  '10000000-0000-4000-8000-000000000401',
  'reading',
  'web'
);

do $$
declare
  blocked boolean;
begin
  blocked := false;
  begin
    insert into public.follows (follower_user_id, followed_user_id)
    values (
      '00000000-0000-4000-8000-000000000401',
      '00000000-0000-4000-8000-000000000401'
    );
  exception when check_violation then
    blocked := true;
  end;

  if not blocked then
    raise exception 'self-follow was not blocked';
  end if;
end;
$$;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000401';
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000401","email":"schema-a@example.edu","role":"authenticated"}';

do $$
declare
  blocked boolean;
begin
  blocked := false;
  begin
    insert into public.papers (title, source_type)
    values ('Client-created canonical paper', 'manual');
  exception when others then
    blocked := true;
  end;

  if not blocked then
    raise exception 'authenticated client can insert canonical papers directly';
  end if;

  update public.papers
  set title = 'Client-mutated canonical paper'
  where id = '10000000-0000-4000-8000-000000000401';

  if exists (
    select 1
    from public.papers
    where id = '10000000-0000-4000-8000-000000000401'
      and title = 'Client-mutated canonical paper'
  ) then
    raise exception 'authenticated client can update canonical papers directly';
  end if;
end;
$$;

rollback;
