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
  '00000000-0000-4000-8000-000000000201',
  'authenticated',
  'authenticated',
  'extension-a@example.edu',
  crypt('password', gen_salt('bf')),
  now(),
  now(),
  now()
);

insert into public.beta_access (email, approved_at)
values ('extension-a@example.edu', now());

insert into public.profiles (id, name, username)
values (
  '00000000-0000-4000-8000-000000000201',
  'Extension User A',
  'extension_user_a'
);

insert into public.extension_auth_codes (
  id,
  user_id,
  code_hash,
  expires_at
)
values (
  '40000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000201',
  repeat('a', 64),
  now() + interval '5 minutes'
);

insert into public.extension_sessions (
  id,
  user_id,
  token_hash,
  user_agent,
  extension_version
)
values (
  '50000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000201',
  repeat('b', 64),
  'extension smoke test',
  '0.0.0-test'
);

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000201';
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000201","email":"extension-a@example.edu","role":"authenticated"}';

do $$
begin
  if (select count(*) from public.extension_auth_codes) <> 0 then
    raise exception 'authenticated clients can read extension auth codes';
  end if;

  if (select count(*) from public.extension_sessions) <> 0 then
    raise exception 'authenticated clients can read extension sessions';
  end if;
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1
    from public.extension_auth_codes
    where code_hash = repeat('a', 64)
      and consumed_at is null
      and expires_at > now()
  ) then
    raise exception 'extension auth code hash was not stored server-side';
  end if;

  if not exists (
    select 1
    from public.extension_sessions
    where token_hash = repeat('b', 64)
      and revoked_at is null
  ) then
    raise exception 'extension token hash was not stored server-side';
  end if;
end;
$$;

update public.extension_sessions
set revoked_at = now()
where id = '50000000-0000-4000-8000-000000000201';

do $$
begin
  if not exists (
    select 1
    from public.extension_sessions
    where id = '50000000-0000-4000-8000-000000000201'
      and revoked_at is not null
  ) then
    raise exception 'extension session revoke timestamp was not stored';
  end if;
end;
$$;

rollback;
