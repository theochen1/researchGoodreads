import type { User } from "@supabase/supabase-js";
import { isEmailInAllowlist } from "./env";
import { createServiceRoleClient } from "./supabase";

export type BetaAccessDecision = {
  allowed: boolean;
  admin: boolean;
};

export type BetaAccessRow = {
  email?: string | null;
  approved_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
};

export function isActiveBetaAccessRow(
  row: BetaAccessRow | null | undefined,
): boolean {
  return (
    Boolean(row?.approved_at || row?.accepted_at) &&
    (!row?.expires_at || new Date(row.expires_at) > new Date())
  );
}

export function isBetaEmailAllowlisted(
  email: string | null | undefined,
): boolean {
  return (
    isEmailInAllowlist(email, process.env.ADMIN_EMAIL_ALLOWLIST) ||
    isEmailInAllowlist(email, process.env.BETA_EMAIL_ALLOWLIST)
  );
}

export async function getActiveBetaUserIds(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  userIds?: string[],
): Promise<Set<string>> {
  const { data: accessRows, error: accessRowsError } = await serviceClient
    .from("beta_access")
    .select("email,approved_at,accepted_at,expires_at");

  if (accessRowsError) {
    throw accessRowsError;
  }

  const activeAccessEmails = new Set(
    (accessRows ?? [])
      .filter(isActiveBetaAccessRow)
      .map((row) => row.email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email)),
  );
  const allowedUserIds = userIds ? new Set(userIds) : null;
  const {
    data: { users },
    error: usersError,
  } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (usersError) {
    throw usersError;
  }

  return new Set(
    users
      .filter((authUser) => !allowedUserIds || allowedUserIds.has(authUser.id))
      .filter((authUser) => {
        const email = authUser.email?.trim().toLowerCase();

        return (
          isBetaEmailAllowlisted(email) ||
          (email ? activeAccessEmails.has(email) : false)
        );
      })
      .map((authUser) => authUser.id),
  );
}

export function getDisplayName(user: User): string {
  const metadataName =
    typeof user.user_metadata.name === "string"
      ? user.user_metadata.name
      : undefined;
  const metadataFullName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : undefined;

  return (
    metadataName ?? metadataFullName ?? user.email?.split("@")[0] ?? "User"
  );
}

export function getUsername(user: User): string {
  const base =
    user.email
      ?.split("@")[0]
      ?.toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "user";

  return `${base}_${user.id.slice(0, 8)}`;
}

export async function ensureBetaAccess(
  user: User,
): Promise<BetaAccessDecision> {
  const email = user.email?.trim().toLowerCase();

  if (!email) {
    return { allowed: false, admin: false };
  }

  const adminFromEnv = isEmailInAllowlist(
    email,
    process.env.ADMIN_EMAIL_ALLOWLIST,
  );
  const betaFromEnv = isBetaEmailAllowlisted(email);
  const serviceClient = createServiceRoleClient();
  const { data: accessRows } = await serviceClient
    .from("beta_access")
    .select("id,approved_at,accepted_at,expires_at,is_admin")
    .ilike("email", email)
    .limit(1);

  const accessRow = accessRows?.[0];
  const rowIsActive = isActiveBetaAccessRow(accessRow);
  const allowed = adminFromEnv || betaFromEnv || rowIsActive;
  const admin = adminFromEnv || Boolean(accessRow?.is_admin && rowIsActive);

  if (adminFromEnv || betaFromEnv) {
    if (accessRow) {
      await serviceClient
        .from("beta_access")
        .update({
          approved_at: accessRow.approved_at ?? new Date().toISOString(),
          expires_at: null,
          is_admin: adminFromEnv ? true : accessRow.is_admin && rowIsActive,
        })
        .eq("id", accessRow.id);
    } else {
      await serviceClient.from("beta_access").insert({
        email,
        approved_at: new Date().toISOString(),
        is_admin: adminFromEnv,
      });
    }
  }

  return { allowed, admin };
}

export async function ensureProfile(user: User): Promise<void> {
  const serviceClient = createServiceRoleClient();
  const { data: existingProfile, error: existingProfileError } =
    await serviceClient
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

  if (existingProfileError) {
    throw existingProfileError;
  }

  if (existingProfile) {
    return;
  }

  const { error } = await serviceClient.from("profiles").insert({
    id: user.id,
    name: getDisplayName(user),
    username: getUsername(user),
  });

  if (error) {
    throw error;
  }
}
