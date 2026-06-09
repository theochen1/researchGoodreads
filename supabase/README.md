# Supabase

Local and beta Supabase work lives here.

- Migrations belong in `supabase/migrations`.
- Migration workflow: edit SQL migrations, then run `supabase db reset` against a local Supabase stack before linking/pushing to a hosted project.
- Do not use Supabase Storage for v0; Cairn stores links and metadata, not PDF binaries.
- Google OAuth and deployed redirect URLs must be configured in the Supabase project before auth verification.

## External Setup Required

Create the hosted Supabase project manually, then configure these values in the app environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ADMIN_EMAIL_ALLOWLIST`
- `BETA_EMAIL_ALLOWLIST`
- `EXTENSION_TOKEN_PEPPER`
- `PLASMO_PUBLIC_WEB_APP_URL` for browser extension builds

Google OAuth redirect URLs should include local and deployed callback URLs:

- `http://localhost:3000/auth/callback`
- deployed Vercel app callback URL once available
