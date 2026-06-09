import { headers } from "next/headers";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withApiRoute(async () => {
  // Touch request headers so Next evaluates this route at request time.
  const requestHeaders = await headers();

  return ok(
    {
      host: requestHeaders.get("host"),
      vercelRequestId: requestHeaders.get("x-vercel-id"),
      env: {
        hasNextPublicAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
        hasNextPublicSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasNextPublicSupabaseAnonKey: Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        ),
        hasSupabaseServiceRoleKey: Boolean(
          process.env.SUPABASE_SERVICE_ROLE_KEY,
        ),
        hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
        hasGoogleClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
        hasAdminEmailAllowlist: Boolean(process.env.ADMIN_EMAIL_ALLOWLIST),
        hasBetaEmailAllowlist: Boolean(process.env.BETA_EMAIL_ALLOWLIST),
      },
      deployment: {
        vercel: Boolean(process.env.VERCEL),
        vercelEnv: process.env.VERCEL_ENV ?? null,
        vercelTargetEnv: process.env.VERCEL_TARGET_ENV ?? null,
        vercelUrl: process.env.VERCEL_URL ?? null,
        gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      },
    },
    {
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    },
  );
});
