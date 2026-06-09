create or replace function public.merge_duplicate_papers(
  p_duplicate_paper_id uuid,
  p_surviving_paper_id uuid,
  p_merged_by_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  duplicate_user_paper record;
  surviving_user_paper record;
  duplicate_note record;
  surviving_note record;
begin
  if p_duplicate_paper_id = p_surviving_paper_id then
    raise exception 'duplicate and surviving papers must differ';
  end if;

  if not exists (select 1 from public.papers where id = p_duplicate_paper_id) then
    raise exception 'duplicate paper not found';
  end if;

  if not exists (select 1 from public.papers where id = p_surviving_paper_id) then
    raise exception 'surviving paper not found';
  end if;

  for duplicate_user_paper in
    select *
    from public.user_papers
    where paper_id = p_duplicate_paper_id
      and removed_at is null
  loop
    select *
    into surviving_user_paper
    from public.user_papers
    where user_id = duplicate_user_paper.user_id
      and paper_id = p_surviving_paper_id
      and removed_at is null
    limit 1;

    if not found then
      update public.user_papers
      set paper_id = p_surviving_paper_id
      where id = duplicate_user_paper.id;
    else
      update public.user_papers
      set
        reading_state =
          case
            when duplicate_user_paper.state_updated_at > surviving_user_paper.state_updated_at
              then duplicate_user_paper.reading_state
            else surviving_user_paper.reading_state
          end,
        state_updated_at = greatest(
          duplicate_user_paper.state_updated_at,
          surviving_user_paper.state_updated_at
        ),
        recommendation_signal =
          case
            when coalesce(duplicate_user_paper.signal_updated_at, '-infinity'::timestamptz)
               > coalesce(surviving_user_paper.signal_updated_at, '-infinity'::timestamptz)
              then duplicate_user_paper.recommendation_signal
            else surviving_user_paper.recommendation_signal
          end,
        signal_updated_at = greatest(
          coalesce(duplicate_user_paper.signal_updated_at, '-infinity'::timestamptz),
          coalesce(surviving_user_paper.signal_updated_at, '-infinity'::timestamptz)
        ),
        visible_comment =
          case
            when coalesce(duplicate_user_paper.comment_updated_at, '-infinity'::timestamptz)
               > coalesce(surviving_user_paper.comment_updated_at, '-infinity'::timestamptz)
              then duplicate_user_paper.visible_comment
            else surviving_user_paper.visible_comment
          end,
        comment_updated_at = greatest(
          coalesce(duplicate_user_paper.comment_updated_at, '-infinity'::timestamptz),
          coalesce(surviving_user_paper.comment_updated_at, '-infinity'::timestamptz)
        ),
        captured_url = coalesce(surviving_user_paper.captured_url, duplicate_user_paper.captured_url)
      where id = surviving_user_paper.id;

      update public.user_papers
      set removed_at = now()
      where id = duplicate_user_paper.id;
    end if;
  end loop;

  for duplicate_note in
    select *
    from public.private_notes
    where paper_id = p_duplicate_paper_id
      and archived_at is null
  loop
    select *
    into surviving_note
    from public.private_notes
    where user_id = duplicate_note.user_id
      and paper_id = p_surviving_paper_id
      and archived_at is null
    limit 1;

    if not found then
      update public.private_notes
      set paper_id = p_surviving_paper_id
      where id = duplicate_note.id;
    else
      update public.private_notes
      set body = concat_ws(
        E'\n\n--- Merged duplicate note ---\n\n',
        surviving_note.body,
        duplicate_note.body
      )
      where id = surviving_note.id;

      update public.private_notes
      set archived_at = now()
      where id = duplicate_note.id;
    end if;
  end loop;

  update public.papers
  set
    duplicate_of_paper_id = p_surviving_paper_id,
    deleted_at = now()
  where id = p_duplicate_paper_id;

  insert into public.paper_merges (
    duplicate_paper_id,
    surviving_paper_id,
    merged_by_user_id
  )
  values (
    p_duplicate_paper_id,
    p_surviving_paper_id,
    p_merged_by_user_id
  )
  on conflict (duplicate_paper_id) do update
  set
    surviving_paper_id = excluded.surviving_paper_id,
    merged_by_user_id = excluded.merged_by_user_id,
    created_at = now();
end;
$$;
