create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_not_blank check (length(trim(name)) > 0)
);

create unique index projects_user_name_unique
on public.projects (user_id, lower(name));

create index projects_user_updated_idx
on public.projects (user_id, updated_at desc);

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create table public.project_papers (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_paper_id uuid not null references public.user_papers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_paper_id)
);

create index project_papers_user_paper_idx
on public.project_papers (user_paper_id, project_id);

create index project_papers_project_created_idx
on public.project_papers (project_id, created_at desc, user_paper_id);

alter table public.projects enable row level security;
alter table public.project_papers enable row level security;

create policy "Users can read own projects"
on public.projects
for select
to authenticated
using (public.current_user_has_beta_access() and auth.uid() = user_id);

create policy "Users can create own projects"
on public.projects
for insert
to authenticated
with check (public.current_user_has_beta_access() and auth.uid() = user_id);

create policy "Users can update own projects"
on public.projects
for update
to authenticated
using (public.current_user_has_beta_access() and auth.uid() = user_id)
with check (public.current_user_has_beta_access() and auth.uid() = user_id);

create policy "Users can delete own projects"
on public.projects
for delete
to authenticated
using (public.current_user_has_beta_access() and auth.uid() = user_id);

create policy "Users can read own project memberships"
on public.project_papers
for select
to authenticated
using (
  public.current_user_has_beta_access()
  and exists (
    select 1
    from public.projects
    where projects.id = project_papers.project_id
      and projects.user_id = auth.uid()
  )
);

create policy "Users can create own project memberships"
on public.project_papers
for insert
to authenticated
with check (
  public.current_user_has_beta_access()
  and exists (
    select 1
    from public.projects
    where projects.id = project_papers.project_id
      and projects.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.user_papers
    where user_papers.id = project_papers.user_paper_id
      and user_papers.user_id = auth.uid()
      and user_papers.removed_at is null
  )
);

create policy "Users can delete own project memberships"
on public.project_papers
for delete
to authenticated
using (
  public.current_user_has_beta_access()
  and exists (
    select 1
    from public.projects
    where projects.id = project_papers.project_id
      and projects.user_id = auth.uid()
  )
);
