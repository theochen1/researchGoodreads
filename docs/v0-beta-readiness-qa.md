# V0 Beta Readiness QA

Use this checklist after Supabase, Google OAuth, env vars, migrations, and a deployed or local web app are ready. It is the manual gate for `H01`, `H02`, and `T23` in `v0-task-plan.md`.

Record results in `v0-beta-readiness-results.md` while testing.

## External Setup Gate

- Supabase project exists.
- Migrations in `supabase/migrations` have been applied in order.
- Google OAuth provider is enabled in Supabase.
- Local and deployed callback URLs are configured.
- Required env vars are set:
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `ADMIN_EMAIL_ALLOWLIST`
  - `BETA_EMAIL_ALLOWLIST`
  - `EXTENSION_TOKEN_PEPPER`
  - `PLASMO_PUBLIC_WEB_APP_URL`
- Any Google OAuth secret exposed in local notes, screenshots, chat, or logs has been rotated before real beta use.

## Automated Preflight

Run from the repository root before manual testing:

```sh
npx pnpm@9.15.4 verify:v0
```

Expected result:

- SQL smoke tests pass, including RLS/privacy, feed semantics, extension auth security, schema constraints, analytics security, and 100-follow feed capacity.
- Typecheck, lint, unit tests, web build, extension build, and formatting check pass.

If `next build` was part of the verification run, restart the dev server before browser testing:

```sh
lsof -ti tcp:3000 | xargs -r kill
rm -rf apps/web/.next
npx pnpm@9.15.4 dev
```

## Manual Test Inputs

Use at least two invited Google accounts:

- User A: primary tester and bootstrap admin, ideally `theodore.chen.1@gmail.com`.
- User B: second invited beta user for follow/privacy checks.
- User C: a non-invited Google account for invite-gate rejection.

Record for each manual check:

- pass/fail
- account used
- route or extension page used
- observed result
- screenshot or short note for failures

Suggested URLs:

- arXiv: `https://arxiv.org/abs/1706.03762`
- DOI: any DOI landing page or `https://doi.org/...`
- OpenReview: any OpenReview forum or note URL
- Direct PDF: any publicly reachable `.pdf` URL
- Messy fallback: an unsupported article or arbitrary URL with incomplete metadata

## H01 Web Core Loop Script

1. Sign in as User A with Google OAuth.
2. Confirm User A can access `/library`, `/add`, `/feed`, `/people`, and `/profile`.
3. Confirm User A has access to `/admin` if the account is in `ADMIN_EMAIL_ALLOWLIST`.
4. Sign out, sign in as User C, and confirm User C reaches `/access-pending` or another clear rejection state.
5. Sign back in as User A.
6. Add an arXiv paper by URL.
7. Add the same arXiv paper again and confirm the canonical paper is reused rather than duplicated.
8. Add a DOI paper and confirm duplicate DOI captures reuse the existing canonical paper where the DOI matches.
9. Add an OpenReview paper and confirm duplicate OpenReview captures reuse the existing canonical paper where the OpenReview ID matches.
10. Add the messy fallback URL, edit fields before saving, and confirm the paper is saved.
11. Add a manual title-only paper and confirm the paper page still works with minimal metadata.
12. In Library, confirm reading-state filter works.
13. In Library, confirm recently added and recently updated sorting work.
14. On a paper page, set reading state to `want_to_read`, `reading`, `read`, `deep_read`, and `skipped`, reloading once to confirm persistence.
15. Set, update, and clear each recommendation signal.
16. Create, edit, reload, and delete a private note.
17. Create, edit, reload, and clear a visible comment.
18. Remove one paper and confirm it disappears from User A's library.

Passing result:

- User A can complete the core loop without builder intervention.
- Capture failure is recoverable through manual entry.
- Paper page remains useful with title/source metadata only.
- State updates, private notes, recommendation signals, and visible comments persist across reloads.

## Privacy And Social Visibility Script

1. Sign in as User B.
2. Add or reuse one paper, then set reading state, recommendation signal, visible comment, and private note.
3. Sign in as User A.
4. Before following User B, confirm User B's paper activity is absent from `/feed` and from the paper page social context.
5. Confirm User B's private note is not visible anywhere in the UI.
6. Follow User B from `/people`.
7. Confirm User B's reading state, recommendation signal, and visible comment appear in `/feed`.
8. Confirm the same visible context appears on that paper's page.
9. Confirm User B's private note is still not visible.
10. Sign in as User B and edit only the private note.
11. Sign in as User A and confirm the feed item timestamp did not advance because of the private-note edit.
12. Sign in as User B and update reading state or visible comment several times.
13. Sign in as User A and confirm the feed shows one latest item for that User B paper, not event spam.
14. Sign in as User A and unfollow User B.
15. Confirm User B's feed items disappear immediately.

Backend evidence:

- `npx pnpm@9.15.4 smoke:sql` must pass. The SQL smoke suite covers direct RLS/backend checks for private notes, unfollowed activity, removed activity, feed ordering, stable cursor shape, and 100-follow capacity.

Passing result:

- Private notes never leak through UI or backend checks.
- Follow visibility rules work server-side.
- The feed is latest-state social context, not an event stream.

## Admin QA Script

1. Sign in as the bootstrap admin.
2. Approve a new beta user.
3. Expire or revoke that user's access if available, then re-approve the user.
4. Sign in as a non-admin beta user and confirm `/admin` pages and admin APIs are inaccessible.
5. Edit canonical paper metadata as admin.
6. Merge two duplicate paper records.
7. Confirm merge preserves reading state, recommendation signal, visible comment, and private note text.
8. Confirm the old duplicate paper URL redirects to the surviving paper where applicable.
9. Revoke an extension session and confirm the extension token stops working.

Passing result:

- Builders can run invite, paper metadata, merge, and extension revocation operations without direct database edits.
- Non-admin users cannot reach admin surfaces.

## H02 Extension Capture Script

Build or reuse the extension package:

```sh
npx pnpm@9.15.4 --filter @cairn/extension build
```

Load `apps/extension/build/chrome-mv3-prod` as an unpacked Chrome extension.

1. Open the extension popup while signed out of the extension.
2. Click `Open Cairn sign in`.
3. In the web app, sign in as User A if needed.
4. On `/extension/connect`, click `Create Extension Code`.
5. Copy the one-time code into the extension popup and click `Connect`.
6. Confirm the extension reports a connected/ready state.
7. Save an arXiv page with an initial reading state.
8. Open the saved paper page from the extension and confirm `added_via = extension` through admin data or backend evidence if available.
9. Open the same arXiv page again and confirm the extension indicates the paper is already saved.
10. Update the saved paper's reading state from the extension and confirm the original `added_via` is preserved.
11. Save a DOI page.
12. Save an OpenReview page.
13. Save a Semantic Scholar page or confirm it routes to manual fallback if metadata is insufficient.
14. Save a direct PDF URL or confirm it routes to manual fallback.
15. Save an unsupported/messy URL and confirm manual fallback is understandable.
16. Revoke the extension session in admin.
17. Confirm the extension can no longer read status or save with the revoked token.

Passing result:

- Extension connection works without exposing Supabase refresh tokens.
- Extension save is faster than manual web add for supported pages.
- Manual fallback is clear for unsupported or low-confidence metadata.
- Revoked extension tokens stop working.

## Analytics Checks

Confirm required events are present in Admin Metrics or `analytics_events`:

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

Also confirm:

- Analytics writes are best-effort and do not block user actions.
- Private note bodies never appear in `analytics_events.metadata`.

## Stop/Go

Go to seed beta only if:

- No critical auth or private-note leak exists.
- Core web loop passes without builder intervention.
- Extension connect/capture/revoke passes.
- Admin invite, metadata edit, and merge pass.
- Known resolver misses are logged and recoverable through manual entry.
- 100-account engineering capacity evidence remains green through `npx pnpm@9.15.4 smoke:sql`.
