alter table public.user_papers
add column if not exists latest_visible_at timestamptz;

create or replace function public.set_user_paper_latest_visible_at()
returns trigger
language plpgsql
as $$
begin
  new.latest_visible_at = greatest(
    new.state_updated_at,
    coalesce(new.signal_updated_at, '-infinity'::timestamptz),
    coalesce(new.comment_updated_at, '-infinity'::timestamptz),
    new.added_at
  );

  return new;
end;
$$;

update public.user_papers
set latest_visible_at = greatest(
  state_updated_at,
  coalesce(signal_updated_at, '-infinity'::timestamptz),
  coalesce(comment_updated_at, '-infinity'::timestamptz),
  added_at
)
where latest_visible_at is null;

alter table public.user_papers
alter column latest_visible_at set not null;

drop trigger if exists user_papers_set_latest_visible_at on public.user_papers;

create trigger user_papers_set_latest_visible_at
before insert or update of
  added_at,
  state_updated_at,
  signal_updated_at,
  comment_updated_at
on public.user_papers
for each row execute function public.set_user_paper_latest_visible_at();

drop index if exists user_papers_feed_sort_idx;

create index user_papers_feed_sort_idx
on public.user_papers (latest_visible_at desc, id desc)
where removed_at is null;
