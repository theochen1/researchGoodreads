# V0 Implementation Requirements

## Purpose

This document defines the engineering requirements for building the v0 research-paper tracking tool. It is intended to be a contract between builders: if every required item here is implemented and verified, the v0 is ready for invited beta testing.

The v0 must support low-friction paper capture, personal reading-state tracking, private notes, lightweight visible paper signals/comments, simple following, and followed-user paper context. It must not include shared annotations, public unauthenticated profiles, global ratings, recommendation algorithms, or complex social mechanics.

## Product Constraint

Every required feature must support at least one of these user outcomes:

1. Capture a paper before it is lost.
2. Organize and update the user's own reading state.
3. Remember private thoughts about a paper.
4. Share a low-effort visible signal with followers.
5. See what followed researchers are reading or signaling.

If a feature does not support one of these outcomes, it is not v0.

The visual and interaction direction in `design-principles.md` is a supporting product contract. Interpret it as sentiment and quality bar, not as permission to add future-scope surfaces. For v0, the design principles mean:

- The app should feel like a serious, elegant research workspace, not a Goodreads-like social site or generic SaaS dashboard.
- Paper metadata should be scan-first: title, authors, venue/year, source, personal state, and trusted social signal must be easy to parse.
- Interactions should feel fast through client cache, optimistic UI, and bounded preloading where safe.
- Copy should be calm, concise, and competent.
- Visual design should use restrained color, compact spacing, borders/subtle hover states, and minimal decoration.
- Reviews, collections, topics, citation graphs, command palette, global search, dark mode, and richer knowledge-work surfaces remain directional references unless separately listed as v0 requirements.

## Resolved V0 Judgments

These decisions remove ambiguity from the implementation:

- There are no public/private accounts in v0.
- Trust is represented by one-way following.
- Any authenticated beta user can follow any other authenticated beta user.
- Users only see visible paper activity from people they follow.
- Private notes are always private and are never visible to followers.
- Visible paper comments are optional and secondary.
- The primary social primitive is low-effort: reading state plus optional recommendation signal.
- No flow may require a user to write a visible comment.
- The following feed shows latest visible state per followed user-paper pair, not a full event history.
- The browser extension is required for beta readiness.
- PDF preview is a stretch goal; the initial product saves canonical links and metadata.
- Users can remove papers from their own libraries.
- Canonical paper identity belongs on `Paper`.
- User-specific capture context, if stored, belongs on `UserPaper`, not `Paper`.
- `captured_url` is optional. It should be stored when useful for provenance/debugging, but the product should not depend on showing where a user first saw a paper.

## V0 Beta Size And Capacity Target

The v0 should be designed for a focused invited beta, not public launch scale.

Target beta cohort:

- 30 to 50 invited users.
- 10 to 25 weekly active users.
- 3 to 6 high-signal seed users whose reading activity makes the product more valuable for others.
- Enough adjacent students, postdocs, and collaborators for following-based discovery to be meaningful.

Engineering capacity target:

- 100 authenticated beta accounts.
- 10,000 canonical papers.
- 50,000 user-paper relationships.
- 25,000 private notes.
- 10,000 visible paper comments.
- Following feed queries over at least 100 followed users per viewer.

Architecture implication:

- A single web app, single primary database, and small number of background jobs/workers are sufficient for v0.
- The system should use normal database indexes for user-paper relationships, paper identifiers, follows, and feed sorting.
- The implementation should avoid distributed systems, search infrastructure, PDF storage infrastructure, graph databases, and event-streaming systems unless a concrete v0 requirement cannot be met otherwise.
- Expensive metadata resolution may run asynchronously or with timeout-based fallback.
- Library, paper-page social context, and following feed queries must be paginated or bounded.
- The v0 should be built so it can survive a successful beta without immediate rewrite, but it does not need architecture for thousands of concurrent users.

## Required User Capabilities

The v0 must allow an invited user to:

1. Create an account or accept an invite.
2. Log in and log out.
3. Add a paper by URL.
4. Add a paper manually when URL metadata resolution fails.
5. Save a paper to their personal library.
6. Remove a paper from their personal library.
7. Assign and update a reading state for a saved paper.
8. Write, edit, and delete a private note on a saved paper.
9. Add, update, or clear a visible recommendation signal on a saved paper.
10. Optionally write, edit, or delete a short visible paper comment on a saved paper.
11. Follow and unfollow other authenticated beta users.
12. View latest visible paper activity from followed users.
13. View a paper page with their own state plus followed users' visible states/signals/comments.
14. Use a browser extension to save the current page and assign an initial reading state.
15. Let builders manage beta users, paper metadata, and extension sessions through a basic admin surface.

## Reading States

The implementation must support exactly these initial reading states:

- `want_to_read`
- `reading`
- `read`
- `deep_read`
- `skipped`

Display labels may be user-friendly, but stored values should be stable enum-like identifiers.

Only one reading state may be active per user-paper relationship at a time.

All reading states are visible to followers in v0. This includes `want_to_read` and `skipped`. The justification is that the beta is authenticated and follow-based, and the product needs enough visible signal to test discovery. If this creates social friction in beta, per-paper visibility can be revisited later.

## Recommendation Signals

The implementation must support exactly these initial visible recommendation signals:

- `worth_reading`
- `worth_skimming`
- `useful_reference`
- `not_worth_prioritizing`
- `unsure`

A recommendation signal is optional. A user may have zero or one active recommendation signal per paper.

Recommendation signals are visible to followers. Private notes are not.

## Visible Paper Comments

The implementation must support one optional visible paper comment per user-paper relationship.

Required behavior:

- A visible paper comment is a short paper-level comment, not a PDF annotation.
- A user may create, edit, or delete their own visible paper comment.
- A user's visible paper comment is readable only by users who follow that user.
- Visible paper comments may appear on paper pages and in the following feed.
- Private notes and visible paper comments must be stored separately.
- Visible paper comments must have a hard maximum length of 1000 characters.
- Visible comments are secondary; beta success must not depend on users writing many comments.

## Privacy And Visibility Rules

The v0 must enforce these rules at the data-access layer, not only in the UI:

- A user can read their own private notes.
- A user cannot read another user's private notes.
- A user can edit and delete only their own private notes.
- A user can edit and clear only their own recommendation signal.
- A user can edit and delete only their own visible paper comments.
- A user can see another user's reading state, recommendation signal, and visible paper comment only if they follow that user.
- A user may not see another user's private note text under any circumstance.
- Beta activity must not be publicly accessible without authentication.
- Anonymous activity, shared annotations, public unauthenticated profiles, and external sharing are out of scope.

## Core Data Model

The implementation must include these entities or equivalent structures.

### User

Required fields:

- `id`
- `name`
- `username`
- `email`
- `affiliation` optional
- `role` optional
- `created_at`
- `updated_at`

### Invite Or Access Control

Required behavior:

- Access is limited to invited beta users or manually approved accounts.
- The system must prevent arbitrary public signup unless explicitly enabled by the builders.
- Google OAuth is the default beta login method.
- Password auth is not required unless Google OAuth blocks a beta participant.
- Admin bootstrap must support an environment-variable allowlist.
- Initial admin email is `theodore.chen.1@gmail.com`.

Possible implementation:

- `Invite` entity with `email`, `token`, `accepted_at`, `created_at`, `expires_at`.
- Or an allowlist-based access check.

### Paper

Required fields:

- `id`
- `title`
- `source_type`
- `created_at`
- `updated_at`

Optional fields:

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

Required behavior:

- Paper metadata may be incomplete.
- Paper records must store links and metadata, not PDF file binaries.
- A paper must be saveable with only `title`; `source_type` should default to `manual` when no better source is known.
- `canonical_url` should represent the best standard landing page for the paper when known.
- `pdf_url` should point to the best known renderable PDF when available.
- `canonical_key` should store the best available deduplication key, such as DOI, arXiv ID, OpenReview ID, Semantic Scholar ID, normalized URL, or normalized title-year fallback.
- A paper must be editable by an authorized builder/admin or through a controlled metadata correction flow.

### UserPaper

Represents a user's relationship to a paper.

Required fields:

- `id`
- `user_id`
- `paper_id`
- `reading_state`
- `added_via`
- `added_at`
- `state_updated_at`

Optional fields:

- `recommendation_signal`
- `visible_comment`
- `captured_url`
- `signal_updated_at`
- `comment_updated_at`

Required constraints:

- Unique active pair: `user_id`, `paper_id`.
- One active reading state per user-paper pair.
- Zero or one recommendation signal per user-paper pair.
- Zero or one visible paper comment per user-paper pair.
- `captured_url` is user-specific provenance only. It must not be used as canonical paper identity.

Required `added_via` values:

- `web`
- `extension`
- `manual`

### PrivateNote

Required fields:

- `id`
- `user_id`
- `paper_id`
- `body`
- `created_at`
- `updated_at`

Required constraints:

- Private note text is visible only to its author.
- A user may have one editable private note per paper for v0.

### Follow

Required fields:

- `follower_user_id`
- `followed_user_id`
- `created_at`

Required behavior:

- A user can follow any authenticated beta user.
- A user can unfollow any user they currently follow.
- Following is one-way.
- Activity feed and paper-page social context must be scoped to followed users.

### Following Feed Item

The following feed should be rendered from latest visible user-paper state, not a full activity log.

Required behavior:

- Feed contains at most one item per followed user-paper pair.
- Feed item shows the followed user's latest visible reading state.
- Feed item may also show the followed user's recommendation signal and visible paper comment when present.
- Feed is sorted by the latest visible update time for that user-paper pair.
- Feed pagination must use a stable cursor based on `latest_visible_at` plus `user_paper_id`.
- Feed sort order is `latest_visible_at desc, user_paper_id desc`.
- Private note creation/editing must never affect feed visibility.
- Repeated state updates should update the same feed item rather than creating feed spam.

Possible implementation:

- Derive feed from `UserPaper`.
- Or store a denormalized latest-feed table.
- A historical event log is not required for v0.

## Paper Capture Requirements

### URL Capture

The web app must allow a user to paste a URL and attempt to resolve a paper.

Required supported inputs:

- arXiv abstract URLs
- arXiv PDF URLs
- DOI URLs
- OpenReview URLs
- Semantic Scholar paper URLs
- Direct PDF URLs
- Unknown URLs with manual fallback

Required behavior:

- If metadata is found, prefill paper fields before saving.
- If metadata is incomplete, allow the user to edit fields before saving.
- If metadata lookup fails, allow manual save with title and URL.
- If a likely duplicate is found, attach the user to the existing paper rather than creating a new paper.
- Capture should resolve a standard `canonical_url` and `pdf_url` when possible.
- Capture may preserve the input URL as `UserPaper.captured_url`, but the product must not depend on it.
- Supported page categories may save through manual fallback before full metadata extraction exists.

### Manual Capture

The web app must allow a user to create a paper manually.

Required fields for manual creation:

- `title`

Optional fields for manual creation:

- `canonical_url`
- `authors`
- `year`
- `venue`

## Metadata Resolution Requirements

The implementation must use deterministic identifiers for deduplication when available.

Deduplication priority:

1. DOI
2. arXiv ID
3. OpenReview ID
4. Semantic Scholar ID
5. Normalized canonical URL
6. Normalized title plus year, used only as a fallback

Required metadata resolution targets:

- arXiv
- Direct PDF URL fallback

Phase 2 metadata targets:

- DOI/Crossref
- OpenReview

Stretch metadata targets:

- Semantic Scholar URLs
- Better direct-PDF inference

Optional metadata enrichers:

- OpenAlex
- HTML metadata from the page
- PDF metadata when feasible

The v0 does not need perfect metadata coverage. Failure must degrade to manual entry instead of blocking capture.

Author identity resolution is out of scope for v0. Authors should be stored as plain metadata strings or a simple string array.

## Paper Preview Stretch Goal

The initial v0 should save and display canonical links and metadata rather than rendering PDFs inline.

Required behavior:

- The implementation must not require storing PDF binaries for v0.
- The paper page must show metadata, abstract when available, `canonical_url`, and any available source/PDF links.
- The paper page must remain useful without embedded PDF preview.
- Saving, reading-state updates, private notes, recommendation signals, visible comments, and followed-user context must work without preview.

Stretch behavior:

- Attempt embedded preview from `pdf_url` when a usable PDF URL is available.
- If PDF preview rendering fails, degrade gracefully to metadata/source links.
- Browser-native PDF embedding is sufficient for the first preview attempt.
- PDF.js, proxying, caching, thumbnail generation, and file storage are allowed later but are not required for v0.

## Remove From Library Requirements

The user must be able to remove a paper from their own library.

Required behavior:

- Removing a paper removes the current user's `UserPaper` relationship from active library views.
- Removing a paper removes the current user's visible state, recommendation signal, and visible comment from followers' views.
- Removing a paper removes or archives the current user's private note for that paper.
- The canonical `Paper` record remains if other users have saved it or if the system keeps canonical paper records.
- Hard delete or soft delete is acceptable for v0 if user-visible behavior is identical.
- The UI should confirm removal when the user has a private note or visible comment attached.

## Required Web App Screens

### Auth / Invite

Required:

- Login
- Logout
- Signup or invite acceptance
- Rejection path for non-invited users if access is restricted

### Library

Required:

- List current user's saved papers.
- Filter by reading state.
- Sort by recently added.
- Sort by recently updated.
- Show title, authors if available, year if available, venue/source if available, reading state, and recommendation signal if present.
- Allow quick reading-state update.
- Allow remove from library.
- Link each row/card to the paper page.
- Present rows/cards with compact paper metadata hierarchy rather than oversized content cards.

### Add Paper

Required:

- URL/title input.
- Metadata resolution loading state.
- Editable confirmation form.
- Initial reading-state selector.
- Save action.
- Error state with manual fallback.

### Paper Page

Required:

- Show canonical metadata.
- Show metadata/source-link view.
- Link to canonical source URL when available.
- Link to PDF when available.
- Show current user's reading state when saved.
- Allow current user to save the paper if not already saved.
- Allow current user to update reading state.
- Allow current user to remove paper from library.
- Allow current user to create/edit/delete private note.
- Allow current user to set/clear recommendation signal.
- Allow current user to optionally create/edit/delete visible paper comment.
- Show followed users' reading states, recommendation signals, and visible paper comments for this paper.
- Never show other users' private notes.
- Present the page as a lightweight research dossier over the current v0 data: metadata, abstract, source links, personal state, private note, visible signal/comment, and followed-user context.

### Admin

Required:

- Invite or approve beta users.
- View beta users.
- View canonical papers.
- Edit paper metadata.
- Mark or merge obvious duplicate paper records when safe.
- Revoke extension sessions.

Admin constraints:

- Admin access must be checked server-side.
- Admin role must come from non-user-editable authorization data.
- Admin UI can be plain and utilitarian.

Duplicate merge requirements:

- Admin chooses a surviving `paper`.
- Reassign duplicate paper's `user_papers` to the surviving paper.
- Preserve each user's reading state, recommendation signal, visible comment, and private note.
- If the same user has relationships to both papers, keep the most recently updated reading state.
- If the same user has private notes on both papers, preserve note text through append or an admin-visible conflict flow.
- Delete or soft-hide the duplicate paper after reassignment.
- Keep a minimal merge record so old paper links can redirect to the surviving paper if needed.

### Following Feed

Required:

- Reverse-chronological feed of latest visible followed-user paper states.
- Include paper title, followed user, latest visible reading state, recommendation signal if present, visible comment if present, and latest visible timestamp.
- Link to paper page.
- Exclude private note edits.
- Do not show historical event spam for repeated updates to the same user-paper pair.
- Avoid vanity metrics, likes, follower-count emphasis, or consumer-social interaction framing.

### People / Following

Required:

- List authenticated beta users.
- Allow current user to follow any beta user.
- Allow current user to unfollow any currently followed user.
- Show basic user identity: name, username, affiliation/role if provided.

## Browser Extension Requirements

The browser extension must support the minimum capture loop.

Required:

- User can connect the extension to their web account through a web-mediated auth flow.
- Extension can read the current tab URL.
- Extension can send the URL to the web app/backend capture endpoint.
- Extension allows selecting initial reading state.
- Extension shows whether the current paper is already saved when determinable.
- Extension links to the saved paper page in the web app.
- Extension handles capture failure with a link to manual entry in the web app.

Extension auth requirements:

- Extension must not store Supabase Auth refresh tokens.
- Extension must not call Supabase directly for v0 mutations.
- Extension should receive an opaque extension API token after the user authenticates through the web app.
- Server should store only a hash of the extension API token.
- Extension API tokens must be revocable by an admin.
- Extension API tokens must be scoped to v0 extension operations: capture current URL, read current-user saved status, and open the web paper page.

Required supported page categories:

- arXiv pages
- OpenReview pages
- Semantic Scholar paper pages
- DOI landing pages
- Direct PDFs

Out of scope for extension v0:

- Link detection across arbitrary pages.
- X/Twitter timeline overlays.
- Hover cards.
- Displaying other users' activity inside the extension.
- PDF annotation.

## API / Backend Requirements

The backend must expose functionality equivalent to:

- Create/read authenticated user.
- Accept invite or enforce allowlist.
- Authenticate beta users with Google OAuth.
- Connect extension through web-mediated auth flow.
- Exchange one-time extension auth code for opaque extension API token.
- Create/read/update paper.
- Resolve paper metadata from URL/title.
- Save paper to user's library.
- Remove paper from user's library.
- Update user-paper reading state.
- Update or clear user-paper recommendation signal.
- Create/update/delete current user's visible paper comment.
- Create/read/update/delete current user's private note.
- Follow user.
- Unfollow user.
- List current user's library.
- List latest followed-user feed items.
- Get paper page data with authorized followed-user context.
- Invite or approve beta user as admin.
- Edit paper metadata as admin.
- Merge duplicate papers as admin.
- Revoke extension session as admin.

Authorization must be enforced server-side for every endpoint.

Required server authorization helpers:

- `requireUser(request)`
- `requireExtensionSession(request)`
- `requireAdmin(request)`
- `assertOwnsUserPaper(userId, userPaperId)`
- `assertCanReadPaperContext(userId, paperId)`

## Observability And Beta Metrics

The implementation must make it possible to measure the beta without manually inspecting the database.

Required metrics:

- Number of active users.
- Number of papers added.
- Number of papers removed from libraries.
- Number of papers added by extension versus web app.
- Number of reading-state updates.
- Number of recommendation signals set.
- Number of visible paper comments created.
- Number of private notes created.
- Number of following feed views if feasible.
- Number of papers with interactions from more than one user.

Do not expose private note contents in analytics.

Required analytics events:

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

Analytics writes must be best-effort and must not block user actions.

## Quality Requirements

The v0 must meet these reliability standards before beta:

- A user can complete the core loop in a fresh account.
- Paper capture failures produce recoverable manual-entry states.
- Paper page remains useful with metadata/source links only.
- State updates persist across page reloads.
- Private notes persist across page reloads.
- Other users' private notes cannot be accessed through UI or API.
- Follow visibility rules work server-side.
- Duplicate detection works for DOI, arXiv ID, and OpenReview ID.
- Removing a paper removes it from the user's library and followers' views.
- The app can support 30 to 50 invited beta users and the 100-account engineering capacity target.
- The extension can capture from required supported page categories.

## Required Acceptance Tests

Before beta, manually or automatically verify:

1. Invited user can create account and log in.
2. Non-invited user cannot access the beta if invite-only access is enabled.
3. Invited user can authenticate with Google OAuth.
4. Bootstrap admin email `theodore.chen.1@gmail.com` has admin access.
5. User can add an arXiv paper by URL.
6. User can add a paper manually after metadata failure.
7. Adding the same arXiv paper twice does not create duplicate canonical papers.
8. User can save a paper as `want_to_read`.
9. User can update the paper to `reading`, `read`, `deep_read`, and `skipped`.
10. User can remove a paper from their library.
11. Removing a paper hides that user's state, recommendation signal, and visible comment from followers.
12. User can create, edit, and delete their own private note.
13. User A cannot read User B's private note through the UI.
14. User A cannot read User B's private note through the backend/API.
15. User can set, update, and clear a recommendation signal.
16. User can optionally create, edit, and delete their own visible paper comment.
17. User can follow and unfollow another beta user.
18. User A cannot see User B's visible paper activity before User A follows User B.
19. Followed users' reading states, recommendation signals, and visible paper comments appear on a paper page.
20. Private note edits do not appear in another user's following feed.
21. The following feed shows latest visible state per followed user-paper pair, not a full event history.
22. Following feed pagination is stable when items share timestamps.
23. Extension can connect through web-mediated auth and receive a revocable opaque token.
24. Extension can save an arXiv page with an initial reading state.
25. Extension can save a direct PDF URL or route the user to manual fallback.
26. Extension indicates when the current paper is already saved when determinable.
27. User can recover from bad metadata by editing fields before save.
28. Paper page is useful with metadata/source links only.
29. The system does not store PDF binaries for v0.
30. Admin can invite/approve beta users.
31. Admin can edit paper metadata.
32. Admin can merge duplicate papers while preserving user relationships and notes.
33. Admin can revoke extension sessions.
34. Required analytics events are emitted without storing private note contents.

## Explicit Non-Goals

Do not build these for v0:

- Public/private accounts.
- Follow requests.
- Per-paper visibility controls.
- Shared annotations.
- Shared private notes.
- PDF-anchored comments or annotation threads.
- Comments visible to unauthenticated users.
- Replies, comment threads, likes, or discussion moderation.
- Full historical activity event feed.
- Full PDF reader.
- PDF file storage.
- PDF proxy/cache infrastructure.
- PDF thumbnail generation.
- PDF highlighting.
- Citation manager functionality.
- BibTeX export/import.
- Zotero/Mendeley integration.
- Collections.
- Topics.
- Reviews.
- Global command palette.
- Global search across papers/authors/notes.
- Citation/reference graph views.
- Related-paper recommendation surfaces.
- Community discussion threads.
- Public profiles visible outside the authenticated beta.
- Global paper ratings.
- Global ranking pages.
- Recommendation algorithms.
- AI-generated summaries as a core feature.
- Topic maps or graph visualization.
- Reading goals, streaks, badges, or gamification.
- X/Twitter overlays.
- Author identity resolution.
- Support for every publisher-specific metadata edge case.

## Beta Readiness Definition

The v0 is ready for invited beta testing when:

- Every required user capability is implemented.
- Every required screen exists.
- The extension supports the minimum capture loop.
- Required privacy rules are enforced server-side.
- Required acceptance tests pass.
- The system can be deployed to a stable URL.
- The builders can invite and onboard 30 to 50 users without direct database edits for each core action.
