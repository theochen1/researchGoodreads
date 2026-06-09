create extension if not exists pgcrypto;

create type public.reading_state as enum (
  'want_to_read',
  'reading',
  'read',
  'deep_read',
  'skipped'
);

create type public.recommendation_signal as enum (
  'worth_reading',
  'worth_skimming',
  'useful_reference',
  'not_worth_prioritizing',
  'unsure'
);

create type public.added_via as enum (
  'web',
  'extension',
  'manual'
);

create type public.source_type as enum (
  'arxiv',
  'doi',
  'openreview',
  'semantic_scholar',
  'pdf',
  'manual',
  'unknown'
);

create type public.analytics_event_name as enum (
  'paper_added',
  'paper_removed',
  'paper_added_from_extension',
  'paper_added_from_web',
  'reading_state_updated',
  'recommendation_signal_set',
  'visible_comment_created',
  'private_note_created',
  'follow_created',
  'following_feed_viewed',
  'extension_connected',
  'metadata_resolution_failed'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.beta_access (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  approved_at timestamptz,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_access_email_not_blank check (length(trim(email)) > 0)
);

create unique index beta_access_email_unique
on public.beta_access (lower(email));

create trigger beta_access_set_updated_at
before update on public.beta_access
for each row execute function public.set_updated_at();

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username text not null,
  affiliation text,
  role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_name_not_blank check (length(trim(name)) > 0),
  constraint profiles_username_not_blank check (length(trim(username)) > 0)
);

create unique index profiles_username_unique
on public.profiles (lower(username));

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type public.source_type not null default 'manual',
  authors text[],
  year integer,
  abstract text,
  venue text,
  canonical_url text,
  canonical_key text,
  doi text,
  arxiv_id text,
  openreview_id text,
  semantic_scholar_id text,
  pdf_url text,
  duplicate_of_paper_id uuid references public.papers(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint papers_title_not_blank check (length(trim(title)) > 0),
  constraint papers_year_reasonable check (year is null or (year >= 1500 and year <= 3000)),
  constraint papers_duplicate_not_self check (duplicate_of_paper_id is null or duplicate_of_paper_id <> id)
);

create unique index papers_canonical_key_unique
on public.papers (lower(canonical_key))
where canonical_key is not null and deleted_at is null;

create unique index papers_doi_unique
on public.papers (lower(doi))
where doi is not null and deleted_at is null;

create unique index papers_arxiv_id_unique
on public.papers (lower(arxiv_id))
where arxiv_id is not null and deleted_at is null;

create unique index papers_openreview_id_unique
on public.papers (lower(openreview_id))
where openreview_id is not null and deleted_at is null;

create unique index papers_semantic_scholar_id_unique
on public.papers (lower(semantic_scholar_id))
where semantic_scholar_id is not null and deleted_at is null;

create unique index papers_canonical_url_unique
on public.papers (lower(canonical_url))
where canonical_url is not null and deleted_at is null;

create index papers_title_year_idx
on public.papers (lower(title), year)
where deleted_at is null;

create trigger papers_set_updated_at
before update on public.papers
for each row execute function public.set_updated_at();

create table public.user_papers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_id uuid not null references public.papers(id) on delete restrict,
  reading_state public.reading_state not null default 'want_to_read',
  added_via public.added_via not null,
  added_at timestamptz not null default now(),
  state_updated_at timestamptz not null default now(),
  recommendation_signal public.recommendation_signal,
  visible_comment text,
  captured_url text,
  signal_updated_at timestamptz,
  comment_updated_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_papers_visible_comment_length check (
    visible_comment is null or char_length(visible_comment) <= 1000
  )
);

create unique index user_papers_active_pair_unique
on public.user_papers (user_id, paper_id)
where removed_at is null;

create index user_papers_user_id_idx
on public.user_papers (user_id)
where removed_at is null;

create index user_papers_paper_id_idx
on public.user_papers (paper_id)
where removed_at is null;

create index user_papers_feed_sort_idx
on public.user_papers (
  greatest(
    state_updated_at,
    coalesce(signal_updated_at, '-infinity'::timestamptz),
    coalesce(comment_updated_at, '-infinity'::timestamptz),
    added_at
  ) desc,
  id desc
)
where removed_at is null;

create trigger user_papers_set_updated_at
before update on public.user_papers
for each row execute function public.set_updated_at();

create table public.private_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_id uuid not null references public.papers(id) on delete restrict,
  body text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index private_notes_active_user_paper_unique
on public.private_notes (user_id, paper_id)
where archived_at is null;

create index private_notes_user_id_idx
on public.private_notes (user_id)
where archived_at is null;

create trigger private_notes_set_updated_at
before update on public.private_notes
for each row execute function public.set_updated_at();

create table public.follows (
  follower_user_id uuid not null references auth.users(id) on delete cascade,
  followed_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_user_id, followed_user_id),
  constraint follows_no_self_follow check (follower_user_id <> followed_user_id)
);

create index follows_followed_user_id_idx
on public.follows (followed_user_id, follower_user_id);

create table public.extension_auth_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint extension_auth_codes_hash_not_blank check (length(trim(code_hash)) > 0)
);

create unique index extension_auth_codes_code_hash_unique
on public.extension_auth_codes (code_hash);

create index extension_auth_codes_user_id_idx
on public.extension_auth_codes (user_id);

create table public.extension_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  user_agent text,
  extension_version text,
  constraint extension_sessions_token_hash_not_blank check (length(trim(token_hash)) > 0)
);

create unique index extension_sessions_token_hash_unique
on public.extension_sessions (token_hash);

create index extension_sessions_user_id_idx
on public.extension_sessions (user_id)
where revoked_at is null;

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name public.analytics_event_name not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index analytics_events_event_name_created_at_idx
on public.analytics_events (event_name, created_at desc);

create index analytics_events_user_id_created_at_idx
on public.analytics_events (user_id, created_at desc)
where user_id is not null;

create table public.paper_merges (
  id uuid primary key default gen_random_uuid(),
  duplicate_paper_id uuid not null references public.papers(id) on delete restrict,
  surviving_paper_id uuid not null references public.papers(id) on delete restrict,
  merged_by_user_id uuid references auth.users(id) on delete set null,
  merge_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint paper_merges_not_self check (duplicate_paper_id <> surviving_paper_id)
);

create unique index paper_merges_duplicate_paper_id_unique
on public.paper_merges (duplicate_paper_id);
