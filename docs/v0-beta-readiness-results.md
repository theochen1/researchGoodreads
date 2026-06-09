# V0 Beta Readiness Results

Use this worksheet while running `v0-beta-readiness-qa.md`. Do not mark `T23` complete until every required acceptance test has pass/fail evidence and all critical failures are fixed or explicitly deferred outside v0.

## Run Metadata

- Date:
- Tester:
- Web app URL:
- Supabase project:
- Extension build path: `apps/extension/build/chrome-mv3-prod`
- User A invited/admin account:
- User B invited account:
- User C non-invited account:
- `npx pnpm@9.15.4 verify:v0` result:
- Notes on Google OAuth secret rotation:

## Automated Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| SQL smoke suite |  |  |
| Typecheck |  |  |
| Lint |  |  |
| Unit tests |  |  |
| Web production build |  |  |
| Extension production build |  |  |
| Formatting check |  |  |
| `/login` returns 200 |  |  |
| Protected web routes redirect unauthenticated users |  |  |
| Invalid extension token returns 401 |  |  |
| Unauthenticated API requests return 401 |  |  |

## Required Acceptance Tests

| # | Requirement | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Invited user can create account and log in. |  |  |
| 2 | Non-invited user cannot access the beta if invite-only access is enabled. |  |  |
| 3 | Invited user can authenticate with Google OAuth. |  |  |
| 4 | Bootstrap admin email `theodore.chen.1@gmail.com` has admin access. |  |  |
| 5 | User can add an arXiv paper by URL. |  |  |
| 6 | User can add a paper manually after metadata failure. |  |  |
| 7 | Adding the same arXiv paper twice does not create duplicate canonical papers. |  |  |
| 8 | User can save a paper as `want_to_read`. |  |  |
| 9 | User can update the paper to `reading`, `read`, `deep_read`, and `skipped`. |  |  |
| 10 | User can remove a paper from their library. |  |  |
| 11 | Removing a paper hides that user's state, recommendation signal, and visible comment from followers. |  |  |
| 12 | User can create, edit, and delete their own private note. |  |  |
| 13 | User A cannot read User B's private note through the UI. |  |  |
| 14 | User A cannot read User B's private note through the backend/API. |  |  |
| 15 | User can set, update, and clear a recommendation signal. |  |  |
| 16 | User can optionally create, edit, and delete their own visible paper comment. |  |  |
| 17 | User can follow and unfollow another beta user. |  |  |
| 18 | User A cannot see User B's visible paper activity before User A follows User B. |  |  |
| 19 | Followed users' reading states, recommendation signals, and visible paper comments appear on a paper page. |  |  |
| 20 | Private note edits do not appear in another user's following feed. |  |  |
| 21 | The following feed shows latest visible state per followed user-paper pair, not a full event history. |  |  |
| 22 | Following feed pagination is stable when items share timestamps. |  |  |
| 23 | Extension can connect through web-mediated auth and receive a revocable opaque token. |  |  |
| 24 | Extension can save an arXiv page with an initial reading state. |  |  |
| 25 | Extension can save a direct PDF URL or route the user to manual fallback. |  |  |
| 26 | Extension indicates when the current paper is already saved when determinable. |  |  |
| 27 | User can recover from bad metadata by editing fields before save. |  |  |

## Admin Operations

| Check | Result | Evidence |
| --- | --- | --- |
| Admin can approve a new beta user. |  |  |
| Admin can re-approve an expired beta user. |  |  |
| Non-admin cannot access admin pages. |  |  |
| Non-admin cannot access admin APIs. |  |  |
| Admin can edit canonical paper metadata. |  |  |
| Admin can merge duplicate paper records. |  |  |
| Merge preserves user-paper state, signal, visible comment, and private note text. |  |  |
| Old duplicate paper URL redirects to the surviving paper where applicable. |  |  |
| Admin can revoke an extension session. |  |  |

## Analytics Evidence

| Event | Result | Evidence |
| --- | --- | --- |
| `paper_added` |  |  |
| `paper_removed` |  |  |
| `paper_added_from_extension` |  |  |
| `paper_added_from_web` |  |  |
| `reading_state_updated` |  |  |
| `recommendation_signal_set` |  |  |
| `visible_comment_created` |  |  |
| `private_note_created` |  |  |
| `follow_created` |  |  |
| `following_feed_viewed` |  |  |
| `extension_connected` |  |  |
| `metadata_resolution_failed` |  |  |
| Private note bodies absent from analytics metadata. |  |  |
| Analytics failures do not block user actions. |  |  |

## Issues Found

| Severity | Area | Description | Repro steps | Status |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## Stop/Go Decision

- No critical auth or private-note leak exists:
- Core web loop passes without builder intervention:
- Extension connect/capture/revoke passes:
- Admin invite, metadata edit, and merge pass:
- Known resolver misses are logged and recoverable through manual entry:
- 100-account engineering capacity evidence remains green:
- Decision: `stop` / `go`
- Decision notes:
