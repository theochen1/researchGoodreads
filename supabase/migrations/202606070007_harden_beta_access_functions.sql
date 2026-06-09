create or replace function public.user_has_beta_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.current_user_has_beta_access()
    and exists (
      select 1
      from auth.users
      join public.beta_access
        on lower(beta_access.email) = lower(auth.users.email)
      where auth.users.id = p_user_id
        and (beta_access.approved_at is not null or beta_access.accepted_at is not null)
        and (beta_access.expires_at is null or beta_access.expires_at > now())
    );
$$;

revoke execute on function public.current_user_email()
from public, anon;

revoke execute on function public.current_user_has_beta_access()
from public, anon;

revoke execute on function public.current_user_is_admin()
from public, anon;

revoke execute on function public.user_has_beta_access(uuid)
from public, anon;

grant execute on function public.current_user_email()
to authenticated, service_role;

grant execute on function public.current_user_has_beta_access()
to authenticated, service_role;

grant execute on function public.current_user_is_admin()
to authenticated, service_role;

grant execute on function public.user_has_beta_access(uuid)
to authenticated, service_role;
