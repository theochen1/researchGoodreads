create or replace function public.user_has_beta_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users
    join public.beta_access
      on lower(beta_access.email) = lower(auth.users.email)
    where auth.users.id = p_user_id
      and (beta_access.approved_at is not null or beta_access.accepted_at is not null)
      and (beta_access.expires_at is null or beta_access.expires_at > now())
  );
$$;

drop policy if exists "Users can follow beta users" on public.follows;
drop policy if exists "Users can read followed user papers" on public.user_papers;
drop policy if exists "Authenticated users can read beta profiles" on public.profiles;

create policy "Authenticated users can read beta profiles"
on public.profiles
for select
to authenticated
using (
  public.current_user_has_beta_access()
  and public.user_has_beta_access(profiles.id)
);

create policy "Users can read followed user papers"
on public.user_papers
for select
to authenticated
using (
  public.current_user_has_beta_access()
  and removed_at is null
  and public.user_has_beta_access(user_papers.user_id)
  and exists (
    select 1
    from public.follows
    where follows.follower_user_id = auth.uid()
      and follows.followed_user_id = user_papers.user_id
  )
);

create policy "Users can follow beta users"
on public.follows
for insert
to authenticated
with check (
  public.current_user_has_beta_access()
  and auth.uid() = follower_user_id
  and public.user_has_beta_access(followed_user_id)
);
