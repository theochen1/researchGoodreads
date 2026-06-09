# V0 System And Product Design

## Purpose

This document is the second build contract for v0. It translates the implementation requirements into a lean system architecture, service/tool selection, core product flows, and visual layout rules.

The goal is not to design the final product. The goal is to define the simplest coherent system that satisfies `v0-implementation-requirements.md` and can be built quickly without creating obvious technical debt.

## Design Thesis

The v0 should feel like a serious, elegant research-paper workspace: fast, refined, information-dense, and quietly intelligent. A useful shorthand is `Linear x Readwise x Semantic Scholar`, but this is directional only. Do not copy those products literally.

Within v0 scope, this means a private paper library with a lightweight followed-user signal layer. The interface should feel like a place where thoughtful researchers organize, understand, and revisit literature over time.

This design indexes on the cross-product patterns summarized in `v0-product-patterns-research.md`: personal utility first, capture at the moment of encounter, canonical object plus user-object relationship, optional expression, followed-person signal over global consensus, and link/metadata storage before owned file infrastructure.

The product should not feel like:

- A citation manager.
- A public academic social network.
- A PDF annotation tool.
- A paper-ranking site.
- A Twitter/X overlay.
- A full literature search engine.
- A Goodreads-like consumer review site.
- A generic SaaS dashboard.
- A university portal.
- A chaotic AI wrapper.

The user experience should prioritize:

1. Fast capture.
2. Clear personal library state.
3. Paper pages that remain useful even when metadata or preview fails.
4. Low-effort visible signal.
5. A following feed that helps users notice papers through trusted people.
6. Scan-first metadata hierarchy that makes paper title, authors, venue/year, state, and social signal immediately legible.
7. Fast-feeling interactions through client-side cache, optimistic UI, and bounded background preloading, while preserving server-side authorization.

## Recommended Stack

### Web App

Use Next.js with TypeScript.

Reasons:

- Supports app UI and server-side API routes in one codebase.
- Fits a small team moving quickly.
- Deploys cleanly on Vercel.
- Allows server-side metadata resolution without standing up a separate backend.

### Hosting

Use Vercel for the web app.

Reasons:

- Low operational burden.
- Good fit for Next.js.
- Serverless route handlers are sufficient for v0 metadata resolution and API operations.
- Avoids managing servers before product behavior is validated.

### Database And Auth

Use Supabase for:

- Postgres database.
- Auth.
- Row Level Security.
- SQL views/functions where useful.

Reasons:

- Postgres is the right data model for canonical papers, user-paper relationships, follows, and notes.
- Supabase Auth avoids custom auth work.
- Row Level Security gives us a direct way to enforce private notes and followed-user visibility.
- Supabase is enough for v0 without adding a separate backend service.

Do not use Supabase Storage for v0. We are storing paper links and metadata, not PDF binaries.

Auth method:

- Use Google OAuth for beta users.
- Gate access with invite/allowlist approval.
- Do not build password auth unless Google OAuth blocks a beta participant.

Admin bootstrap:

- Bootstrap admin access with an environment-variable allowlist.
- Initial admin email: `theodore.chen.1@gmail.com`.
- Longer term, admin state can live in Supabase `app_metadata` or an internal admin table.

### Browser Extension

Use Plasmo with TypeScript/React.

Reasons:

- The extension is part of the core v0 loop.
- Plasmo reduces boilerplate around Chrome extension setup, build tooling, and React UI.
- The extension can share types with the web app later if we use a monorepo.

### API Boundary

Use Next.js route handlers for all mutations and orchestration.

Required route-handler responsibilities:

- Paper URL capture.
- Metadata resolution.
- Deduplication orchestration.
- Extension capture endpoint.
- Save/remove paper.
- Reading state updates.
- Recommendation signal updates.
- Visible comment updates.
- Private note updates.
- Follow/unfollow.
- Admin actions.

Use Supabase client-side reads only where RLS directly enforces the intended access pattern and the query is simple.

Design rule:

- The web app should not have a fragmented write path.
- Mutations go through Next.js route handlers.
- Supabase RLS remains defense-in-depth and protects direct reads.
- Route handlers that use service-role access must implement explicit authorization checks before touching data.

TanStack Query is recommended once the first route handlers are in place, because the app will have repeated server-state reads/mutations across Library, Paper Page, Feed, and Extension status. Use it for cache invalidation and mutation loading states; do not use it to hide unclear API boundaries.

## Architecture

### High-Level Shape

```text
Browser Extension
  -> Next.js capture API
  -> Supabase Postgres

Web App
  -> Supabase Auth
  -> Supabase Postgres with RLS
  -> Next.js metadata/capture API when needed

Metadata Resolvers
  -> arXiv first, then Crossref/OpenReview, then Semantic Scholar/direct URL improvements
  -> canonical Paper record
```

### Deployment Shape

```text
Vercel
  - Next.js web app
  - Route handlers for capture and metadata

Supabase
  - Auth
  - Postgres
  - RLS policies
  - SQL views/functions as needed

Chrome Extension
  - Plasmo extension
  - Authenticated requests to capture endpoint
```

### Explicit Non-Architecture

Do not add these for v0:

- Separate backend service.
- Graph database.
- Search infrastructure.
- Event streaming.
- PDF storage.
- PDF proxy/cache service.
- Background job system beyond simple serverless route calls/timeouts.
- Dedicated recommendation service.
- Separate analytics warehouse.
- Direct Supabase mutation calls from the extension.
- Supabase Auth session tokens stored directly in the extension.

## Data Model Design

The implementation requirements remain the source of truth. This section gives the concrete design interpretation.

### `users`

Backed by Supabase Auth plus an authenticated beta profile table.

Profile fields:

- `id`
- `name`
- `username`
- `affiliation`
- `role`
- `created_at`
- `updated_at`

The profile table is visible only to authenticated beta users. Email should not be exposed through the public beta profile table; keep email in Supabase Auth/admin-only views.

### `papers`

Canonical paper object.

Required fields:

- `id`
- `title`
- `source_type`
- `created_at`
- `updated_at`

Optional metadata:

- `authors`
- `year`
- `abstract`
- `venue`
- `canonical_url`
- `canonical_key`
- `doi`
- `arxiv_id`
- `openreview_id`
- `semantic_scholar_id`
- `pdf_url`

Design rule:

- `papers` stores canonical identity and metadata.
- `papers` never stores user-specific encounter context.
- `papers` never stores PDF binaries.

### `user_papers`

User-specific relationship to a paper.

Fields:

- `id`
- `user_id`
- `paper_id`
- `reading_state`
- `added_via`
- `added_at`
- `state_updated_at`
- `recommendation_signal`
- `visible_comment`
- `captured_url`
- `signal_updated_at`
- `comment_updated_at`
- `removed_at` if using soft delete

Design rule:

- `captured_url` is optional provenance.
- The UI should not depend on `captured_url`.
- The unique active pair is `user_id + paper_id`.

### `private_notes`

Private user memory.

Fields:

- `id`
- `user_id`
- `paper_id`
- `body`
- `created_at`
- `updated_at`

Design rule:

- Private notes are never readable by followers.
- Private notes must be protected by RLS, not just hidden in UI.

### `follows`

One-way following.

Fields:

- `follower_user_id`
- `followed_user_id`
- `created_at`

Design rule:

- Any authenticated beta user can follow any other authenticated beta user.
- No requests, approvals, or private accounts in v0.

### Following Feed

Do not build a full event log.

Use a query/view over `user_papers` joined with `follows`, `papers`, and `profiles`.

Feed item is the latest visible state for one followed user-paper pair.

Sort key:

```text
greatest(state_updated_at, signal_updated_at, comment_updated_at, added_at)
```

If this query becomes too slow within the v0 capacity target, create a denormalized `following_feed_items` table. Do not start there.

## Authorization Design

Use Supabase RLS as the primary authorization boundary.

Required policy behavior:

- Authenticated users can read beta user profiles.
- Users can read and mutate their own `user_papers`.
- Users can read followed users' visible `user_papers`.
- Users can read and mutate only their own private notes.
- Users cannot read another user's private note through any client-accessible path.
- Users can create/delete their own follow rows.
- Paper records can be readable by authenticated users.

Service-role access should be limited to server-side route handlers that genuinely require it, such as capture/deduplication, admin operations, extension-token exchange, and metadata repair.

## Backend-For-Frontend Design

Next.js should act as a backend-for-frontend.

Why:

- The web app and extension need the same capture/dedupe behavior.
- Metadata resolution needs server-side API calls and timeouts.
- Some operations need multiple writes that should not be split across client calls.
- The extension should not own broad database credentials or Supabase auth session tokens.

Route handlers should use one of two modes:

1. User-session mode.
   - Used by the web app.
   - Reads the Supabase user session from secure web auth cookies.
   - Performs explicit user authorization.
   - Uses normal Supabase user context or service role depending on the operation.

2. Extension-token mode.
   - Used by the browser extension.
   - Reads an opaque extension API token from the extension request.
   - Maps token to a user via an `extension_sessions` table.
   - Performs the same authorization rules as web user-session mode.

Design rule:

- Do not let the extension speak directly to Supabase.
- Do not rely on browser cookies automatically being available inside extension requests.
- Do not store Supabase refresh tokens in the extension for v0.

Shared server authorization helpers:

- `requireUser(request)` for authenticated web route handlers.
- `requireExtensionSession(request)` for extension-token route handlers.
- `requireAdmin(request)` for admin route handlers.
- `assertOwnsUserPaper(userId, userPaperId)` for user-paper mutation routes.
- `assertCanReadPaperContext(userId, paperId)` for paper-page context routes.

These helpers should be built before feature route handlers so service-role access does not sprawl across the codebase.

## Extension Auth Design

Use a web-mediated extension connection flow. This matches the pattern used by mature browser-extension products: the extension sends the user to the web app for login/account management, then receives a scoped extension session.

Recommended flow:

1. Extension starts unauthenticated.
2. User clicks `Sign in`.
3. Extension uses Chrome's web auth flow or opens a web app connection URL.
4. User logs into the web app with normal Supabase Auth.
5. Web app creates a short-lived one-time extension authorization code.
6. Extension receives the code through the Chrome extension redirect flow or a controlled callback page.
7. Extension exchanges the one-time code for an opaque extension API token.
8. Extension stores the opaque token in extension storage.
9. Extension sends that token only to Cairn Next.js route handlers.

Recommended database table:

```text
extension_sessions
- id
- user_id
- token_hash
- created_at
- last_used_at
- revoked_at
- user_agent optional
- extension_version optional
```

One-time code table:

```text
extension_auth_codes
- id
- user_id
- code_hash
- created_at
- expires_at
- consumed_at
```

Token behavior:

- Extension tokens are opaque random secrets.
- Store only token hashes in the database.
- Tokens are revocable.
- Tokens are scoped to v0 extension operations: capture current URL, read current-user saved status, and open the web paper page.
- Tokens must not grant access to private notes from other users or broad database reads.

Extension UX:

- Popup should feel like a lightweight companion to the web app.
- If signed out, it should send users to the web login/connect flow.
- If signed in, it should show current page save status and reading-state controls.

Overlay direction:

- A Grammarly-style page overlay is a good later interaction model.
- For v0, limit overlay work to supported paper pages if implemented at all.
- The overlay may show a small save/status button and, when cheaply available, a compact followed-user signal count.
- The overlay should not show full social context; `See what people are saying` should open the paper page in the web app.
- Do not build arbitrary X/Twitter timeline overlays in v0.

Sources informing this decision:

- Chrome provides `chrome.identity.launchWebAuthFlow` and extension redirect URL helpers for browser-extension web auth flows.
- Chrome content scripts run in isolated worlds, so content-script UI should be treated as a constrained overlay, not a normal web app.
- Supabase recommends server-side auth setup for Next.js and RLS for granular database authorization.

## Paper Capture Design

### Web Capture Flow

1. User opens Add Paper.
2. User pastes a URL or title.
3. UI sends input to Next.js capture/resolve endpoint.
4. Server attempts identifier extraction and metadata resolution.
5. Server returns either:
   - existing canonical paper candidate
   - new metadata draft
   - manual fallback draft
6. User confirms/edit fields.
7. System creates or reuses `papers`.
8. System creates or restores `user_papers`.
9. User lands on paper page or library row.

### Extension Capture Flow

1. User opens extension on a paper page or PDF.
2. Extension reads current tab URL.
3. User selects initial reading state.
4. Extension sends URL/state to capture endpoint.
5. Server resolves/dedupes paper.
6. Server creates or updates `user_papers`.
7. Extension shows saved status and link to paper page.

### Capture Design Principle

The capture path should never dead-end.

If metadata resolution fails, user should still be able to save:

- title
- source type `manual`
- optional URL
- initial reading state

## Metadata Resolution Design

Resolution order:

1. Parse known identifier from URL.
2. Resolve source-specific metadata.
3. Check for existing paper by identifier.
4. If no identifier exists, normalize URL and check canonical URL.
5. If still unknown, use normalized title + year fallback.
6. If resolution fails, return manual fallback.

Required resolvers:

- arXiv URL/ID.
- Direct PDF URL fallback.

Phase 2 resolvers:

- DOI/Crossref.
- OpenReview URL.

Phase 3 resolvers:

- Semantic Scholar URL.

Optional enrichers:

- OpenAlex.
- HTML metadata parsing.
- PDF metadata parsing.

Resolver behavior:

- Use short timeouts.
- Prefer partial metadata over failure.
- Never block save because optional enrichment failed.

Implementation phasing:

- Build arXiv + manual fallback first.
- Add DOI/Crossref and OpenReview second.
- Add Semantic Scholar and better direct-PDF inference third.
- Do not let resolver completeness block app design or core capture behavior.

## Paper Preview Design

PDF preview is a stretch goal for v0.

Initial product behavior:

- Save and display canonical links and metadata.
- Paper pages should include source/PDF links when known.
- The page should remain fully useful without embedded PDF preview.

Stretch behavior:

- Include a preview region when `pdf_url` is available.
- Treat PDF preview as progressive enhancement only.

Preview priority:

1. Embedded PDF from `pdf_url`.
2. Metadata card with abstract.
3. Source links only.

Required fallback:

- If preview fails, show a non-broken metadata/source-link state.
- User controls must remain available regardless of preview status.

Design rule:

- Do not make the PDF preview visually dominate the page so much that fallback feels broken.
- The stable product surface is metadata + state controls + private note + visible signal/comment + followed-user context.

Build rule:

- Do not task PDF preview until capture, library, paper page, following feed, and extension save are working.

## Core Screens And Layout

### Global Layout

Desktop-first for v0.

Use a restrained, dense app layout:

- Left sidebar navigation.
- Main content area.
- Right/context panel on object-detail surfaces where it improves scanning.
- Compact rows/cards rather than oversized marketing-style panels.
- Clear metadata hierarchy before decoration.

Primary nav:

- Library
- Feed
- Add Paper
- People

Secondary nav/user menu:

- Profile/account
- Logout

V0 should not add broad navigation entries for future product areas until the underlying surface exists. Collections, Topics, Reviews, command palette, and global search can inform the layout direction, but they are deferred unless explicitly added to the v0 task plan.

### Library

Purpose:

- Personal paper organization.

Layout:

- Header with search/filter controls.
- Segmented filter for reading states.
- Sort control: recently added, recently updated.
- Dense list/table of saved papers.

Each row should show:

- Title.
- Authors/year when available.
- Venue/source when available.
- Reading state control.
- Recommendation signal if present.
- Last updated timestamp.
- Remove action.

Design priority:

- Library should feel fast and scannable.
- It should be usable even with incomplete metadata.
- The default should feel like an intelligent reading queue, not a spreadsheet dump.
- Paper title and state should dominate; authors, venue, year, and source should be compact and muted.

### Add Paper

Purpose:

- Fast capture from URL/title.

Layout:

- Single prominent input.
- Initial reading-state selector.
- Resolve/save action.
- Metadata confirmation/edit area after resolve.
- Manual fallback when resolution fails.

Design priority:

- Do not make the user fill out a form before resolution.
- The default path should be paste -> resolve -> save.
- Metadata failure should feel recoverable and calm, not apologetic.

### Paper Page

Purpose:

- Central object view for a paper.

Layout:

- Top metadata/header area.
- Main source/metadata region.
- Right action/context panel on desktop.
- Stacked layout on mobile.

Header:

- Title.
- Authors/year/venue if available.
- Source links.

Main source/metadata region:

- Metadata and abstract by default.
- Use `Abstract` as the user-facing section label. Treat “research dossier” as an internal layout concept, not a heading.
- Use saved abstracts as the standard paper preview on library/feed/card surfaces when available.
- Canonical source/PDF links when available.
- PDF embed only if the stretch preview work has been implemented.

Action panel:

- Save/remove state.
- Reading state selector.
- Recommendation signal selector.
- Private note editor.
- Optional visible comment editor.

Social context:

- Followed users who saved/read/signaled/commented.
- Keep this compact; do not create a discussion thread.

Design priority:

- The user should always know: what is this paper, what is my state, and what have people I follow signaled?
- The page should feel like a lightweight research dossier, not a blog post, ecommerce product page, or public comment thread.
- V0 dossier scope is metadata, abstract, source links, personal state, private note, visible signal/comment, and followed-user context. Reviews, related papers, citations/references, code/project links, collections, and topic graph views are future surfaces unless already present as metadata links.

### Following Feed

Purpose:

- Lightweight discovery through people the user follows.

Layout:

- Reverse-chronological list.
- One item per followed user-paper pair.

Each item should show:

- Followed user.
- Paper title.
- Latest reading state.
- Recommendation signal when present.
- Visible comment when present.
- Timestamp.

Design priority:

- Avoid event spam.
- Emphasize signal over activity.
- Clicking a feed item opens the paper page.
- Social proof should increase trust and discovery without vanity metrics, likes, follower-count emphasis, or infinite-scroll dopamine patterns.

Feed edge cases:

- Removed `user_papers` must not appear.
- Cleared recommendation signals should disappear from the feed item without deleting the feed item if reading state remains.
- Deleted visible comments should disappear from the feed item without affecting private notes.
- Private note edits must not change feed timestamps.
- If a followed user updates the same paper multiple times, the feed item should update in place.
- If a user unfollows someone, that person's items should disappear from the feed immediately.
- If duplicate paper records are later merged, user-paper relationships should point to the surviving canonical paper.

Pagination:

- Use cursor pagination from the beginning.
- Cursor should be based on `latest_visible_at` plus `user_paper_id`.
- Sort by `latest_visible_at desc, user_paper_id desc`.
- This avoids unstable pagination when multiple feed items share the same timestamp.

### People

Purpose:

- Seed the followed graph.

Layout:

- List/search beta users.
- Basic identity: name, username, affiliation/role.
- Follow/unfollow button.

Design priority:

- Make it easy for a user to find and follow high-signal users during normal use.
- People should support trusted discovery, not feel like a public social graph or popularity leaderboard.

V0 staging:

- A simple People page is required.
- Dedicated onboarding/suggested-follow flows are deferred.
- Seed users can be followed manually during beta setup or through a simple curated list on the People page.

### Admin

Purpose:

- Give builders enough operational control to run the beta without direct database edits for common actions.

Access:

- Admin access should be controlled by a server-side admin check.
- Store admin role in Supabase `app_metadata` or an internal admin allowlist, not user-editable profile metadata.

Required admin capabilities:

- Invite or approve beta users.
- View users.
- View canonical papers.
- Edit paper metadata.
- Mark obvious duplicate paper records for merge or manually merge them if safe.
- Inspect failed metadata-resolution attempts if logged.
- Revoke extension sessions.

Duplicate merge behavior:

- Admin chooses a surviving `paper`.
- Reassign duplicate paper's `user_papers` to the surviving paper.
- Preserve each user's reading state, recommendation signal, visible comment, and private note.
- If the same user has relationships to both papers, keep the most recently updated reading state and preserve private note text by appending or keeping both in an admin-visible conflict flow.
- Delete or soft-hide the duplicate paper after reassignment.
- Keep a minimal merge record so old links can redirect to the surviving paper if needed.

Admin non-goals:

- Full moderation system.
- Complex role hierarchy.
- Public support tooling.
- Bulk import/export.

Design priority:

- Admin can be plain and utilitarian.
- It exists to reduce beta ops friction, not to become a product surface.

## Interaction Performance

Library filtering should preserve scalable server-query boundaries while avoiding avoidable first-click latency.

For v0, this means:

- Treat each library filter as its own bounded first-page query, not as a request to load the entire library into the browser.
- Speculatively prefetch the first page for each reading-state filter under the primary `Recently updated` sort after authenticated app load.
- When the user changes library sort mode, prefetch the first page for each reading-state filter under that sort.
- Keep the cached first page immediately usable while later pagination or infinite scrolling can fetch additional pages on demand.
- Prefetch initial data for primary app tabs: library, feed, people, and profile.
- Prefetch a small bounded set of likely paper detail records from the warmed library/feed first pages; do not preload every paper.
- Prefer background revalidation and visible pending indicators over blocking page or tab interaction.

## Visual Design Direction

The interface should feel like a serious research tool, not a marketing site. The design north star is a calm, precise, scholarly workspace that feels slightly premium without being decorative.

Directional references:

- Linear for density, crisp interaction, precise spacing, and low chrome.
- Readwise Reader for calm personal library and reading-workspace affordances.
- Semantic Scholar for trustworthy paper metadata hierarchy and research-product clarity.
- Notion/Obsidian only for personal knowledge-work feeling; avoid blank-canvas ambiguity and document-editor sprawl.

Use:

- Dense but readable layouts.
- Muted neutral surfaces.
- Strong typography hierarchy.
- Clear state labels.
- Small status badges.
- Simple icon buttons for common actions.
- Minimal decoration.
- 8px-based spacing, with dense lists around 12-16px vertical rhythm.
- Restrained typography where paper titles are prominent but not huge, metadata is compact/muted, and abstracts remain readable.
- Borders and subtle hover states over heavy shadows.
- Accent color to guide attention, not decorate.

Avoid:

- Hero sections.
- Decorative cards inside cards.
- Oversized gradients.
- Gamification visuals.
- Social-media-like engagement chrome.
- Public-comment-thread aesthetics.
- Goodreads-like review aesthetics.
- Generic SaaS dashboard composition.
- University-portal utility clutter.
- Loud colors, rainbow tags, neon accents, emoji, decorative illustrations, glassmorphism, and heavy drop shadows.
- Excessively rounded or bubbly cards.

The visual identity can later incorporate the broader exploration/marker metaphor. V0 should prioritize clarity and speed.

Voice and copy should be concise, calm, and competent. Prefer direct actions such as `Save to library`, `Mark as reading`, `Clear signal`, and `Find related work` over hype copy.

## Interaction Design Rules

### Reading State

Reading state should be quick to change from:

- Library row.
- Paper page.
- Extension save flow.

Use compact controls, not a full edit form.
Use optimistic UI where the server write has a clear deterministic result. Roll back on API failure.

### Recommendation Signal

Recommendation signal should be optional and one-click/low-friction.

Do not require text after setting a signal.
Recommendation language should feel like research judgment, not consumer rating.

### Visible Comment

Visible comment should be available but quiet.

Do not make it the primary call to action.
Treat visible comments as lightweight signal/context, not a discussion thread.

### Private Note

Private note should feel like personal memory, not publishing.

It should be visually distinct from visible comment.
The copy and layout should make this privacy distinction understandable without instruction text whenever possible.

### Remove From Library

Removal should be available but not prominent enough to be accidental.

Confirm removal when private note or visible comment exists.

## Extension Product Design

Extension popup states:

1. Not signed in.
2. Detecting current page.
3. Paper not saved.
4. Paper already saved.
5. Capture failed/manual fallback.

Required popup controls:

- Current page/paper title when known.
- Reading state selector.
- Save/update button.
- Open in web app link.
- Manual fallback link.

Design priority:

- The extension should be faster than opening the web app.
- It should not try to show full social context in v0.

## Build Sequence

Build in this order:

1. Supabase schema, RLS, and seed users.
2. Google OAuth + invite/allowlist flow.
3. Paper, user-paper, private note, follow data access.
4. Backend-for-frontend route handlers for core mutations.
5. Web add-paper flow with arXiv + manual fallback.
6. Admin invite/user/paper metadata tools.
7. Library.
8. Paper page without preview.
9. Reading state and recommendation signal controls.
10. Private note and visible comment controls.
11. Following feed.
12. Extension auth/connect flow.
13. Extension capture.
14. DOI/Crossref + OpenReview resolvers.
15. Observability/beta metrics.
16. Acceptance test pass.
17. Stretch: Semantic Scholar/direct-PDF improvements.
18. Stretch: PDF preview/fallback.

Reasoning:

- The web app proves the object model first.
- The extension should integrate into a working capture endpoint rather than define it.
- PDF preview should not block core state/note/social behavior.
- Admin exists early enough to support beta setup and metadata repair.

## Testing Design

Design acceptance should include:

- A user can understand the app with no walkthrough.
- Adding a paper from arXiv feels fast.
- Metadata failure still feels like a valid path.
- Library remains useful with incomplete metadata.
- Paper page remains useful without PDF preview.
- Private note and visible comment are visually distinct.
- Feed does not look like noisy activity spam.
- New user can follow high-signal users quickly.
- Extension save is faster than opening the web app.

## Observability Design

Use simple application/database events for v0, not a separate analytics warehouse.

Recommended event table:

```text
analytics_events
- id
- user_id nullable
- event_name
- entity_type nullable
- entity_id nullable
- metadata jsonb
- created_at
```

Required events:

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

Rules:

- Do not store private note bodies in analytics.
- Keep analytics writes best-effort; they must not block user actions.
- Use these events to answer beta questions, not to build personalization in v0.

## Source Scope Design

The extension and web capture can accept many source URLs before full metadata resolvers exist.

Interpretation:

- "Supported page category" means the user can save that URL and continue through manual fallback if metadata extraction is incomplete.
- It does not mean full metadata extraction is guaranteed for every category on day one.

Initial high-quality source:

- arXiv.

Accepted with fallback:

- DOI landing pages.
- OpenReview pages.
- Semantic Scholar pages.
- Direct PDFs.
- Unknown URLs.

Design rule:

- Do not make the capture UI apologize excessively for partial metadata.
- Let the user save the paper and improve metadata later through admin repair or future resolvers.

## RLS Draft

This is a draft policy shape, not final migration SQL. Exact table/column names may change.

Enable RLS on all exposed tables:

```sql
alter table profiles enable row level security;
alter table papers enable row level security;
alter table user_papers enable row level security;
alter table private_notes enable row level security;
alter table follows enable row level security;
```

Profiles:

```sql
create policy "Authenticated users can read beta profiles"
on profiles for select
to authenticated
using (auth.uid() is not null);

create policy "Users can update own profile"
on profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
```

Papers:

```sql
create policy "Authenticated users can read papers"
on papers for select
to authenticated
using (auth.uid() is not null);
```

Canonical paper writes should happen through server route handlers with explicit authorization. Do not expose client-side insert/update policies on `papers` for ordinary users in v0.

User-paper reads:

```sql
create policy "Users can read own user papers"
on user_papers for select
to authenticated
using (
  removed_at is null
  and (select auth.uid()) = user_id
);

create policy "Users can read followed user papers"
on user_papers for select
to authenticated
using (
  removed_at is null
  and exists (
    select 1
    from follows
    where follows.follower_user_id = (select auth.uid())
      and follows.followed_user_id = user_papers.user_id
  )
);
```

User-paper writes:

```sql
create policy "Users can insert own user papers"
on user_papers for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own user papers"
on user_papers for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
```

Private notes:

```sql
create policy "Users can read own private notes"
on private_notes for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own private notes"
on private_notes for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own private notes"
on private_notes for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own private notes"
on private_notes for delete
to authenticated
using ((select auth.uid()) = user_id);
```

Follows:

```sql
create policy "Users can read follows involving themselves"
on follows for select
to authenticated
using (
  (select auth.uid()) = follower_user_id
  or (select auth.uid()) = followed_user_id
);

create policy "Users can follow as themselves"
on follows for insert
to authenticated
with check ((select auth.uid()) = follower_user_id);

create policy "Users can unfollow as themselves"
on follows for delete
to authenticated
using ((select auth.uid()) = follower_user_id);
```

Recommended indexes:

```sql
create index user_papers_user_id_updated_idx
on user_papers (user_id, state_updated_at desc);

create index user_papers_paper_id_user_id_idx
on user_papers (paper_id, user_id);

create unique index user_papers_active_unique_idx
on user_papers (user_id, paper_id)
where removed_at is null;

create index follows_follower_followed_idx
on follows (follower_user_id, followed_user_id);

create index follows_followed_follower_idx
on follows (followed_user_id, follower_user_id);

create unique index papers_doi_unique_idx
on papers (doi)
where doi is not null;

create unique index papers_arxiv_unique_idx
on papers (arxiv_id)
where arxiv_id is not null;

create unique index papers_openreview_unique_idx
on papers (openreview_id)
where openreview_id is not null;
```

RLS notes:

- Supabase recommends enabling RLS on exposed tables.
- Policies should target `to authenticated`.
- Use `(select auth.uid())` patterns in policies to avoid unnecessary per-row function overhead where possible.
- Follow-based RLS must be load-tested against the v0 capacity target.
- Service-role route handlers bypass RLS and must enforce authorization manually.

## Sources And Tooling References

- Supabase provides Postgres, Auth, APIs, and RLS; its docs emphasize enabling RLS for exposed schemas and using policies for granular authorization.
- Vercel supports deploying Next.js applications and server-rendering through Vercel Functions.
- Plasmo describes itself as a browser extension SDK/framework.
- TanStack Query is recommended for v0 server-state fetching and mutation cache invalidation after route-handler boundaries are established.

References:

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/architecture
- https://vercel.com/docs/concepts/next.js/overview
- https://docs.plasmo.com/
- https://tanstack.com/query/docs/docs
- https://developer.chrome.com/docs/extensions/reference/api/identity
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
