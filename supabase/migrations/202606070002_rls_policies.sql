create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select lower(nullif(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.current_user_has_beta_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.beta_access
    where lower(beta_access.email) = public.current_user_email()
      and (beta_access.approved_at is not null or beta_access.accepted_at is not null)
      and (beta_access.expires_at is null or beta_access.expires_at > now())
  );
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.beta_access
    where lower(beta_access.email) = public.current_user_email()
      and beta_access.is_admin = true
      and public.current_user_has_beta_access()
  );
$$;

alter table public.beta_access enable row level security;
alter table public.profiles enable row level security;
alter table public.papers enable row level security;
alter table public.user_papers enable row level security;
alter table public.private_notes enable row level security;
alter table public.follows enable row level security;
alter table public.extension_auth_codes enable row level security;
alter table public.extension_sessions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.paper_merges enable row level security;

create policy "Admins can read beta access rows"
on public.beta_access
for select
to authenticated
using (public.current_user_is_admin());

create policy "Admins can insert beta access rows"
on public.beta_access
for insert
to authenticated
with check (public.current_user_is_admin());

create policy "Admins can update beta access rows"
on public.beta_access
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Authenticated users can read beta profiles"
on public.profiles
for select
to authenticated
using (public.current_user_has_beta_access());

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id and public.current_user_has_beta_access());

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id and public.current_user_has_beta_access())
with check (auth.uid() = id and public.current_user_has_beta_access());

create policy "Authenticated users can read papers"
on public.papers
for select
to authenticated
using (public.current_user_has_beta_access() and deleted_at is null);

create policy "Users can read own user papers"
on public.user_papers
for select
to authenticated
using (
  public.current_user_has_beta_access()
  and auth.uid() = user_id
  and removed_at is null
);

create policy "Users can read followed user papers"
on public.user_papers
for select
to authenticated
using (
  public.current_user_has_beta_access()
  and removed_at is null
  and exists (
    select 1
    from public.follows
    where follows.follower_user_id = auth.uid()
      and follows.followed_user_id = user_papers.user_id
  )
);

create policy "Users can insert own user papers"
on public.user_papers
for insert
to authenticated
with check (public.current_user_has_beta_access() and auth.uid() = user_id);

create policy "Users can update own user papers"
on public.user_papers
for update
to authenticated
using (public.current_user_has_beta_access() and auth.uid() = user_id)
with check (public.current_user_has_beta_access() and auth.uid() = user_id);

create policy "Users can delete own user papers"
on public.user_papers
for delete
to authenticated
using (public.current_user_has_beta_access() and auth.uid() = user_id);

create policy "Users can read own private notes"
on public.private_notes
for select
to authenticated
using (
  public.current_user_has_beta_access()
  and auth.uid() = user_id
  and archived_at is null
);

create policy "Users can insert own private notes"
on public.private_notes
for insert
to authenticated
with check (public.current_user_has_beta_access() and auth.uid() = user_id);

create policy "Users can update own private notes"
on public.private_notes
for update
to authenticated
using (public.current_user_has_beta_access() and auth.uid() = user_id)
with check (public.current_user_has_beta_access() and auth.uid() = user_id);

create policy "Users can delete own private notes"
on public.private_notes
for delete
to authenticated
using (public.current_user_has_beta_access() and auth.uid() = user_id);

create policy "Users can read own follow rows"
on public.follows
for select
to authenticated
using (
  public.current_user_has_beta_access()
  and auth.uid() = follower_user_id
);

create policy "Users can follow beta users"
on public.follows
for insert
to authenticated
with check (
  public.current_user_has_beta_access()
  and auth.uid() = follower_user_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = follows.followed_user_id
  )
);

create policy "Users can unfollow users they follow"
on public.follows
for delete
to authenticated
using (
  public.current_user_has_beta_access()
  and auth.uid() = follower_user_id
);
