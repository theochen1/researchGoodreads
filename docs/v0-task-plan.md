# V0 Task Plan

## Purpose

This document converts `v0-implementation-requirements.md` and `v0-system-design.md` into a buildable task DAG.

Each task includes:

- Goal
- Dependencies
- Implementation path
- Verification
- Human-in-the-loop testing where valuable

The plan assumes the v0 stack:

- Next.js + TypeScript
- Vercel
- Supabase Postgres/Auth/RLS
- Google OAuth with invite/allowlist gate
- Plasmo browser extension
- Next.js route handlers for all mutations/orchestration
- Supabase RLS as database-level authorization

## DAG Overview

```text
T00 Project Setup
  -> T01 Supabase Project And Environments
  -> T02 App Shell

T01 -> T03 Schema And Migrations
T01 -> T04 Google OAuth And Invite Gate
T03 -> T05 RLS Policies And Indexes
T04 -> T06 Server Auth Helpers
T05 + T06 -> T07 Data Access And Route Handler Skeleton

T07 -> T18 Analytics Events
T07 -> T08 Admin Bootstrap And Admin Shell
T07 -> T09 Paper Capture Core
T07 -> T10 Library
T07 -> T11 Paper Page Core
T07 -> T12 People And Following

T09 + T18 -> T13 arXiv Resolver And Manual Fallback
T10 + T11 -> T14 Reading State And Recommendation Signal
T11 -> T15 Private Notes And Visible Comments
T12 + T14 + T15 -> T16 Following Feed
T08 + T09 -> T17 Admin Paper Metadata And Merge

T09 + T10 + T11 + T14 + T15 + T16 + T18 -> H01 Web App Usability Test

T06 + T08 + T09 + T18 -> T19 Extension Auth
T19 -> T20 Extension Capture
T20 -> H02 Extension Capture Test

T13 -> T21 DOI/Crossref Resolver
T13 -> T22 OpenReview Resolver
H01 + H02 + T21 + T22 -> T23 Beta Readiness QA
T23 -> H03 Seed Beta
```

Parallel work:

- `T02` can run while `T01/T03` are being built.
- `T08`, `T09`, `T10`, `T11`, `T12`, and `T18` can start after `T07`.
- `T21` and `T22` can run after arXiv/manual capture works.
- `T21` and `T22` can be built after arXiv/manual capture, but they must pass before seed beta because beta readiness requires DOI and OpenReview duplicate detection where feasible.
- Extension work starts after the capture endpoint, auth helpers, admin revoke surface, and analytics helper exist.

## T00 Project Setup

Goal:

- Create the baseline repository structure and development workflow.

Dependencies:

- None.

Implementation path:

- Initialize Next.js app with TypeScript.
- Choose package manager and lockfile.
- Add linting, formatting, typecheck, and test commands.
- Add environment variable template.
- Add basic README with setup instructions.
- Decide monorepo shape if extension will live in the same repo.

Verification:

- Fresh checkout can install dependencies.
- `lint`, `typecheck`, and basic test command run locally.
- Environment template documents Supabase, Google OAuth, and admin allowlist variables.

## T01 Supabase Project And Environments

Goal:

- Create the database/auth foundation for local and beta environments.

Dependencies:

- `T00`.

Implementation path:

- Create Supabase project.
- Configure local env variables.
- Enable Google OAuth provider.
- Configure redirect URLs for local and deployed web app.
- Decide migration workflow.
- Add environment variables for admin bootstrap allowlist, including `theodore.chen.1@gmail.com`.

Verification:

- App can connect to Supabase.
- Local and beta environment variables are documented.
- Google OAuth provider is configured but not yet wired into app UI.

## T02 App Shell

Goal:

- Create the visual and navigation foundation for the web app.

Dependencies:

- `T00`.

Implementation path:

- Read `design-principles.md` and translate its sentiment into the shell without expanding v0 scope.
- Build desktop-first app shell.
- Add left navigation: Library, Feed, Add Paper, People.
- Add account menu placeholder.
- Add restrained visual system: typography, spacing, buttons, form controls, badges, table/list patterns.
- Ensure layout supports dense, serious research-tool surfaces rather than marketing pages, Goodreads-like social UI, or generic SaaS dashboard composition.

Verification:

- App shell renders at desktop and mobile widths.
- Navigation routes exist as empty states.
- Text does not overflow in primary shell components.
- Visual tone is calm, precise, scannable, and paper-metadata first.

Human-in-the-loop:

- Quick builder review of visual density and tone before feature work accumulates.

## T03 Schema And Migrations

Goal:

- Implement the core relational model.

Dependencies:

- `T01`.

Implementation path:

- Create `profiles`.
- Create `papers`.
- Create `user_papers`.
- Create `private_notes`.
- Create `follows`.
- Create `extension_auth_codes`.
- Create `extension_sessions`.
- Create `analytics_events`.
- Add paper merge tracking table, such as `paper_merges`.
- Add enums/check constraints for reading states, recommendation signals, `added_via`, source types, and analytics event names where practical.
- Add timestamps and soft-delete fields where required.

Verification:

- Migrations apply cleanly from empty database.
- Required constraints exist:
  - one active `user_papers` row per `user_id + paper_id`
  - one private note per user-paper if implemented that way
  - visible comment max length
  - unique paper identifiers where non-null
- Schema supports no PDF binary storage.

## T04 Google OAuth And Invite Gate

Goal:

- Allow only invited/approved users to access the app through Google OAuth.

Dependencies:

- `T01`, `T02`.

Implementation path:

- Add Google OAuth sign-in.
- Create invite/allowlist check after auth callback.
- Create or update profile on first allowed login.
- Reject non-invited users with a clear access-pending screen.
- Bootstrap admin access from environment-variable allowlist.
- Ensure beta-visible profile does not expose email.

Verification:

- Invited Google account can log in.
- Non-invited Google account cannot access app.
- `theodore.chen.1@gmail.com` receives admin access through bootstrap allowlist.
- Logout works.

Human-in-the-loop:

- Builder signs in with target admin email and confirms the login/rejection flows feel understandable.

## T05 RLS Policies And Indexes

Goal:

- Enforce privacy and followed-user visibility at the database layer.

Dependencies:

- `T03`.

Implementation path:

- Enable RLS on exposed tables.
- Add profile read/update policies.
- Add paper read policy for authenticated users.
- Do not expose ordinary client insert/update policies on canonical `papers`.
- Add own/followed read policies on `user_papers`.
- Add own-only read/write policies on `private_notes`.
- Add own follow insert/delete policies on `follows`.
- Add indexes for:
  - paper identifiers
  - `user_papers.user_id`
  - `user_papers.paper_id`
  - active user-paper uniqueness
  - follows in both directions
  - feed sorting

Verification:

- Direct client attempts cannot read another user's private notes.
- User can read followed users' visible user-paper rows.
- User cannot read unfollowed users' visible user-paper rows.
- Paper records are readable by authenticated users.
- RLS tests cover positive and negative cases.

Human-in-the-loop:

- None; this is automated/security verification.

## T06 Server Auth Helpers

Goal:

- Centralize authorization so route handlers do not hand-roll auth checks.

Dependencies:

- `T04`, `T05`.

Implementation path:

- Implement `requireUser(request)`.
- Implement `requireAdmin(request)`.
- Implement `requireExtensionSession(request)`.
- Implement `assertOwnsUserPaper(userId, userPaperId)`.
- Implement `assertCanReadPaperContext(userId, paperId)`.
- Add helper for service-role Supabase client usage.
- Add standard error responses for unauthorized/forbidden/not found.

Verification:

- Unit tests for each helper.
- Service-role route handlers cannot be called without passing helper checks.
- Admin-only helper recognizes bootstrap admin and rejects normal users.

## T07 Route Handler Skeleton And API Conventions

Goal:

- Establish the backend-for-frontend contract before feature routes multiply.

Dependencies:

- `T06`.

Implementation path:

- Define API response shape for success/error.
- Define validation approach for request bodies.
- Add route-handler wrappers for auth, validation, and analytics best-effort logging.
- Add placeholder routes for capture, library, paper page, notes/comments, follow, admin, extension.

Verification:

- Example authenticated route works.
- Example admin route works only for admin.
- Example extension-token route rejects missing/invalid token.
- API errors are consistent.

## T08 Admin Bootstrap And Admin Shell

Goal:

- Give builders enough operational control to run beta setup without database edits.

Dependencies:

- `T07`.

Implementation path:

- Create admin route group.
- Add admin navigation hidden from non-admin users.
- Add beta invite/approval UI.
- Add users table.
- Add extension sessions table with revoke action.
- Keep UI plain and utilitarian.

Verification:

- Admin can invite/approve beta users.
- Non-admin cannot access admin pages or routes.
- Admin can revoke an extension session.

Human-in-the-loop:

- Builder uses admin UI to invite a test account and revoke a fake extension session.

## T09 Paper Capture Core

Goal:

- Create the canonical capture path used by both web app and extension.

Dependencies:

- `T07`, `T03`.

Implementation path:

- Build capture/resolve endpoint.
- Accept URL or title.
- Parse obvious source type.
- Return existing paper candidate, metadata draft, or manual fallback draft.
- Build Add Paper screen with URL/title input.
- Add metadata resolution loading state.
- Add editable confirmation form for title, authors, year, venue/source, canonical URL, and PDF URL when available.
- Add initial reading-state selector before save.
- Add save action that creates or reuses `papers` and creates or restores `user_papers`.
- Store `added_via`.
- Store optional `captured_url`.
- Ensure source type defaults to `manual` when unknown.
- Support manual save with title only.
- Preserve manual fallback with title and optional URL when metadata resolution fails.

Verification:

- URL capture creates paper and user-paper.
- Manual fallback creates paper and user-paper.
- Metadata resolution shows a loading state.
- User can edit bad or incomplete metadata before saving.
- User can assign an initial reading state during capture.
- Duplicate capture attaches to existing paper where deterministic ID exists.
- Capture records `added_via`.
- Capture never requires PDF storage.

## T10 Library

Goal:

- Build the user's personal paper organization surface.

Dependencies:

- `T07`, `T09`.

Implementation path:

- List current user's active `user_papers`.
- Show title, authors/year/venue/source when available.
- Filter by reading state.
- Sort by recently added and recently updated.
- Add quick reading-state control placeholder or active control if `T14` is complete.
- Add remove-from-library action.
- Confirm removal when a private note or visible comment exists.
- Remove or archive the user's private note when removing the paper.
- Paginate or bound list queries.

Verification:

- Library shows saved papers.
- Filters and sorts work.
- Removed papers disappear from library.
- Removing a paper removes or archives the user's private note.
- Removal with a private note or visible comment requires confirmation.
- Incomplete metadata still renders cleanly.

Human-in-the-loop:

- Builder adds 10 messy papers and confirms the library remains scannable.

## T11 Paper Page Core

Goal:

- Build the canonical paper object surface without PDF preview.

Dependencies:

- `T07`, `T09`.

Implementation path:

- Show canonical metadata.
- Show metadata/source-link view.
- Link to canonical URL and PDF URL when available.
- Show current user's saved state when saved.
- Allow save if not saved.
- Allow remove from library.
- Reserve areas for private note, visible signal/comment, and followed-user context.

Verification:

- Paper page works for complete metadata.
- Paper page works for title-only/manual fallback.
- Paper page is useful without PDF preview.
- Remove action hides user's state from followers after feed/social context exists.
- Remove action removes or archives the user's private note and confirms when a private note or visible comment exists.

## T12 People And Following

Goal:

- Implement one-way following among authenticated beta users.

Dependencies:

- `T07`, `T05`.

Implementation path:

- Build People page.
- List authenticated beta profiles without exposing emails.
- Add follow/unfollow actions.
- Add followed/unfollowed state.
- Add simple search/filter if cheap; otherwise keep list bounded.

Verification:

- User can follow and unfollow another beta user.
- Follow rows are scoped to current user.
- Direct client access respects follow RLS.

Human-in-the-loop:

- Builder reviews whether finding seed users is easy enough without a dedicated onboarding flow.

## T13 arXiv Resolver And Manual Fallback

Goal:

- Provide the first high-quality metadata resolver while preserving fallback behavior.

Dependencies:

- `T09`.

Implementation path:

- Parse arXiv abstract and PDF URLs.
- Extract arXiv ID.
- Resolve title, authors, year, abstract, canonical URL, and PDF URL when available.
- Deduplicate by arXiv ID.
- For direct PDF/unknown URLs, create fallback draft without blocking save.
- Log `metadata_resolution_failed` best-effort when resolution fails.

Verification:

- arXiv abstract URL resolves.
- arXiv PDF URL resolves to same canonical paper.
- Same arXiv paper captured twice does not duplicate canonical paper.
- Unknown URL can still be saved manually.

Human-in-the-loop:

- Test with 10 real arXiv links from current research workflow and record metadata misses.

## T14 Reading State And Recommendation Signal

Goal:

- Implement the primary personal and visible social primitives.

Dependencies:

- `T10`, `T11`, `T18`.

Implementation path:

- Add reading-state update route.
- Add recommendation-signal update/clear route.
- Add compact UI controls on Library and Paper Page.
- Emit analytics events.
- Update `state_updated_at` and `signal_updated_at`.

Verification:

- User can set every required reading state.
- User can set/update/clear every recommendation signal.
- State persists after reload.
- Signal is visible to followers but not unfollowed users.

## T15 Private Notes And Visible Comments

Goal:

- Add private memory and optional visible expression without making comments primary.

Dependencies:

- `T11`, `T07`, `T18`.

Implementation path:

- Add private note create/update/delete routes.
- Add visible comment create/update/delete route.
- Enforce 1000-character visible comment limit.
- Separate UI treatments for private note and visible comment.
- Ensure private note edits do not affect feed timestamp.
- Emit analytics events without note body.

Verification:

- User can create/edit/delete own private note.
- User cannot read another user's private note through UI or API.
- User can create/edit/delete own visible comment.
- Visible comment is visible to followers.
- Private note body never appears in analytics.

Human-in-the-loop:

- Ask 2-3 users to distinguish private note vs visible comment in UI without explanation.

## T16 Following Feed

Goal:

- Implement latest-state followed-user paper discovery.

Dependencies:

- `T12`, `T14`, `T15`.

Implementation path:

- Build feed query/view over follows, user_papers, papers, profiles.
- Build paper-page followed-user context query using the same visibility rules.
- Compute `latest_visible_at`.
- Sort by `latest_visible_at desc, user_paper_id desc`.
- Implement cursor pagination.
- Exclude removed user-papers.
- Exclude private note edits from feed timestamp.
- Show latest reading state, signal, visible comment, timestamp.
- On paper pages, show followed users' reading states, recommendation signals, and visible comments for that paper.
- Never include followed users' private notes in paper-page context.

Verification:

- Feed shows followed users only.
- Feed does not show unfollowed users.
- Feed shows one item per followed user-paper pair.
- Repeated updates modify existing feed item, not event spam.
- Pagination is stable when timestamps collide.
- Unfollow removes that user's feed items.
- Paper page shows followed users' visible states/signals/comments for the current paper.
- Paper page does not show unfollowed users' visible activity.
- Paper page never shows another user's private note.

Human-in-the-loop:

- Seed 3 fake users with paper activity and ask builder whether the feed feels useful or noisy.

## T17 Admin Paper Metadata And Merge

Goal:

- Let builders repair metadata and handle duplicate paper records safely.

Dependencies:

- `T08`, `T09`, `T15`.

Implementation path:

- Add admin paper list/detail view.
- Add edit metadata form.
- Add duplicate merge action.
- Merge behavior:
  - admin chooses surviving paper
  - reassign duplicate paper's user_papers
  - preserve reading state, recommendation signal, visible comment, private note
  - if same user has both papers, keep most recently updated reading state
  - preserve both private note texts by append or admin-visible conflict flow
  - soft-hide/delete duplicate
  - create merge record for redirect

Verification:

- Admin can edit paper metadata.
- Non-admin cannot edit paper metadata.
- Merge preserves user-paper relationships.
- Merge preserves private notes and visible comments.
- Old duplicate paper route redirects or resolves to surviving paper.

Human-in-the-loop:

- Builder performs a merge on seeded duplicate papers and inspects all affected user views.

## T18 Analytics Events

Goal:

- Capture minimal beta observability without adding an analytics warehouse.

Dependencies:

- `T07`.

Implementation path:

- Create best-effort `trackEvent` helper.
- Emit required events:
  - `paper_added`
  - `paper_removed`
  - `paper_added_from_extension`
  - `paper_added_from_web`
  - `reading_state_updated`
  - `recommendation_signal_set`
  - `visible_comment_created`
  - `private_note_created`
  - `follow_created`
  - `following_feed_viewed`
  - `extension_connected`
  - `metadata_resolution_failed`
- Add admin/basic dashboard or SQL view for beta metrics.

Verification:

- Required events are emitted.
- Analytics failure does not block user action.
- Private note body is never stored in analytics metadata.

## H01 Web App Usability Test

Goal:

- Validate the web core loop before extension work consumes attention.

Dependencies:

- `T09`, `T10`, `T11`, `T14`, `T15`, `T16`, `T18`.

Test participants:

- 3 to 5 friendly researchers/builders.

Test script:

- Log in with Google OAuth.
- Add 3 papers, including one arXiv and one messy/manual fallback.
- Update reading state.
- Add private note.
- Add recommendation signal.
- Optionally add visible comment.
- Follow another user.
- Check feed.
- Remove one paper.

Success criteria:

- Users complete flow without builder intervention.
- Capture failures feel recoverable.
- Private note vs visible comment is understood.
- Feed is not perceived as noisy.

Output:

- Prioritized fixes before extension work.

## T19 Extension Auth

Goal:

- Connect the browser extension to the user's web account with a scoped opaque token.

Dependencies:

- `T06`, `T08`, `T09`, `T18`.

Implementation path:

- Scaffold Plasmo extension.
- Add unauthenticated popup state.
- Add web-mediated connect flow.
- Create one-time auth code route.
- Create token exchange route.
- Store only token hash server-side.
- Store opaque token in extension storage.
- Add revoke support through admin.
- Emit `extension_connected`.

Verification:

- User can connect extension after web login.
- Invalid/expired one-time code fails.
- Revoked extension token stops working.
- Extension does not store Supabase refresh token.
- Extension does not call Supabase directly.

## T20 Extension Capture

Goal:

- Let users save the current paper page from the extension.

Dependencies:

- `T19`, `T09`, `T13`, `T14`, `T18`.

Implementation path:

- Extension reads current tab URL.
- Extension calls capture endpoint with opaque token.
- Extension lets user choose initial reading state.
- Extension shows already-saved status when determinable.
- Extension links to paper page in web app.
- Extension routes failures to manual fallback in web app.
- Support page categories through save/manual fallback:
  - arXiv
  - DOI landing pages
  - OpenReview
  - Semantic Scholar
  - direct PDFs
  - unknown URLs

Verification:

- Extension saves arXiv URL.
- Extension saves direct PDF or opens manual fallback.
- Existing saved paper shows saved status.
- `added_via = extension`.
- Extension capture emits analytics.

Human-in-the-loop:

- Builder uses extension during normal browsing for one day and records every failed capture.

## H02 Extension Capture Test

Goal:

- Validate that extension capture is faster and easier than opening the web app manually.

Dependencies:

- `T20`.

Test participants:

- 3 to 5 friendly researchers.

Test script:

- Install extension.
- Connect account.
- Save 5 papers from normal browsing.
- Include arXiv, direct PDF, and one unsupported/messy URL.
- Open saved paper in web app.

Success criteria:

- Users can connect extension without help.
- Extension save feels faster than manual web add.
- Manual fallback is understandable.
- Failures are logged and recoverable.

## T21 DOI/Crossref Resolver

Goal:

- Add phase-two DOI metadata resolution.

Dependencies:

- `T13`.

Implementation path:

- Parse DOI URLs and DOI strings.
- Query Crossref.
- Normalize DOI.
- Populate title, authors, year, venue, canonical URL, DOI.
- Deduplicate by DOI.
- Preserve manual fallback on failure.

Verification:

- DOI URL resolves.
- Same DOI captured twice dedupes.
- Crossref failure still allows manual save.

## T22 OpenReview Resolver

Goal:

- Add phase-two OpenReview metadata resolution.

Dependencies:

- `T13`.

Implementation path:

- Parse OpenReview forum/note IDs.
- Resolve title, authors, venue/year when available, canonical URL, PDF URL.
- Deduplicate by OpenReview ID.
- Preserve manual fallback on failure.

Verification:

- OpenReview URL resolves.
- Same OpenReview paper dedupes.
- Failure still allows manual save.

## T23 Beta Readiness QA

Goal:

- Verify all v0 acceptance criteria before seed beta.

Dependencies:

- `T08` through `T20`, `H01`, `H02`.
- `T21` and `T22` are required before seed beta to satisfy DOI and OpenReview duplicate-detection readiness.

Implementation path:

- Run automated tests.
- Run RLS negative tests.
- Run route-handler auth tests.
- Run manual acceptance script from `v0-implementation-requirements.md`.
- Check analytics event emission.
- Check admin bootstrap and admin routes.
- Check app against 100-account capacity target with seeded data where feasible.
- Check extension connect/capture/revoke.
- Check DOI/Crossref and OpenReview resolver acceptance.

Verification:

- Every required acceptance test passes.
- No known private note leak path.
- No known unauthenticated beta activity path.
- No broken core flow.
- Known resolver limitations are documented.

## H03 Seed Beta

Goal:

- Test with the first real research-orbit users.

Dependencies:

- `T23`.

Participants:

- 10 to 15 initial invited users.
- Include 2 to 3 high-signal seed users if possible.

Test plan:

- Personally onboard seed users.
- Ask each user to add at least 5 papers.
- Ask each user to follow at least 3 people.
- Ask each user to use extension for real browsing.
- Run beta for 1 week before expanding.

Metrics to watch:

- Papers added.
- Extension vs web capture ratio.
- State updates per paper.
- Recommendation signals per paper.
- Private notes created.
- Feed views.
- Papers with multiple user interactions.
- Metadata failures.

Qualitative questions:

- Did capture feel low-friction?
- Did library replace any existing paper-tracking workflow?
- Did followed-user activity help decide what to read?
- Did visible signaling feel too public or useful?
- Did extension installation/auth create friction?

Exit criteria:

- Core capture/library/state loop works for real usage.
- At least some followed-user paper activity is useful.
- No critical auth/privacy bugs.
- Extension capture is meaningfully used.

## Deferred Tasks

These are intentionally not in v0 task order:

- Public/private accounts.
- Follow requests.
- Per-paper visibility.
- PDF preview.
- PDF storage.
- Full PDF reader.
- X/Twitter overlays.
- Recommendation algorithms.
- Global paper rankings.
- Rich onboarding/suggested-follow flow.
- Zotero/Mendeley import/export.
- Author identity resolution.
- Semantic Scholar resolver beyond stretch.
- Reviews.
- Collections.
- Topics.
- Global command palette.
- Global search across papers/authors/notes.
- Citation/reference graph views.
- Related-paper recommendation surfaces.
- Community discussion threads.
