# Cairn

V0 research-paper tracking and lightweight followed-user signal tool.

## Stack

- Next.js + TypeScript web app in `apps/web`
- Plasmo browser extension in `apps/extension`
- Shared enum/API types in `packages/shared`
- Supabase Postgres/Auth/RLS migrations in `supabase/migrations`
- Vercel for deployment

## Setup

This repo is configured for pnpm. If pnpm is not installed globally, commands can be run with:

```sh
npx pnpm@9.15.4 install
```

Then copy the env template:

```sh
cp .env.example .env.local
```

Fill in Supabase and Google OAuth values once the Supabase project and Google provider exist.

For extension builds, ensure `PLASMO_PUBLIC_WEB_APP_URL` points at the web app the extension should call. For local development this can stay `http://localhost:3000`; for beta builds it should be the deployed Vercel URL.

## Commands

```sh
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm smoke:sql
pnpm verify:v0
pnpm format
```

`pnpm smoke:sql` runs every SQL smoke test in `supabase/smoke-tests` against the local Supabase database. It defaults to `127.0.0.1:54322` with `postgres/postgres`, and can be pointed elsewhere with standard `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` environment variables.

`pnpm verify:v0` runs the SQL smoke tests, typecheck, lint, unit tests, web build, extension build, and formatting check. Use it before the manual H01/H02 beta-readiness flows.

The extension build reads Plasmo public env vars at build time. If you build from `apps/extension`, provide `PLASMO_PUBLIC_WEB_APP_URL` in that shell or an extension-local env file.

```sh
cp apps/extension/.env.example apps/extension/.env.local
```

## Current Build Contract

Use these documents as the source of truth while building:

- `docs/v0-task-plan.md`
- `docs/v0-implementation-requirements.md`
- `docs/v0-system-design.md`
- `docs/v0-beta-readiness-qa.md`
- `docs/v0-beta-readiness-results.md`
- `docs/design-principles.md`

Do not add PDF storage, public unauthenticated activity, shared annotations, public profiles, global rankings, recommendation algorithms, or direct Supabase mutation calls from the extension for v0.
