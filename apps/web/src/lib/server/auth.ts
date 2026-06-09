import type { User } from "@supabase/supabase-js";
import { forbidden, notFound, unauthorized } from "../api/errors";
import {
  ensureBetaAccess,
  getActiveBetaUserIds,
  isActiveBetaAccessRow,
} from "./access";
import { hashExtensionToken } from "./crypto";
import { getOptionalEnv, isEmailInAllowlist } from "./env";
import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "./supabase";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  user: User;
};

export type ExtensionSession = {
  id: string;
  userId: string;
};

export function parseBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");

  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function requireUser(
  request?: Request,
): Promise<AuthenticatedUser> {
  void request;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw unauthorized();
  }

  const access = await ensureBetaAccess(user);

  if (!access.allowed) {
    throw forbidden("Beta access required");
  }

  return {
    id: user.id,
    email: user.email ?? null,
    user,
  };
}

export async function requireAdmin(
  request?: Request,
): Promise<AuthenticatedUser> {
  const currentUser = await requireUser(request);

  if (
    currentUser.email &&
    isEmailInAllowlist(
      currentUser.email,
      getOptionalEnv("ADMIN_EMAIL_ALLOWLIST"),
    )
  ) {
    return currentUser;
  }

  if (!currentUser.email) {
    throw forbidden("Admin access required");
  }

  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("beta_access")
    .select("is_admin,approved_at,accepted_at,expires_at")
    .ilike("email", currentUser.email)
    .maybeSingle();

  if (error || !data?.is_admin || !isActiveBetaAccessRow(data)) {
    throw forbidden("Admin access required");
  }

  return currentUser;
}

export async function requireExtensionSession(
  request: Request,
): Promise<ExtensionSession> {
  const token = parseBearerToken(request);

  if (!token) {
    throw unauthorized("Extension API token required");
  }

  const tokenHash = hashExtensionToken(token);
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("extension_sessions")
    .select("id,user_id,revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data || data.revoked_at) {
    throw unauthorized("Invalid extension API token");
  }

  const {
    data: { user },
    error: userError,
  } = await serviceClient.auth.admin.getUserById(data.user_id);

  if (userError || !user) {
    throw unauthorized("Invalid extension API token");
  }

  const access = await ensureBetaAccess(user);

  if (!access.allowed) {
    throw forbidden("Beta access required");
  }

  await serviceClient
    .from("extension_sessions")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    id: data.id,
    userId: data.user_id,
  };
}

export async function assertOwnsUserPaper(
  userId: string,
  userPaperId: string,
): Promise<void> {
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("user_papers")
    .select("id")
    .eq("id", userPaperId)
    .eq("user_id", userId)
    .is("removed_at", null)
    .maybeSingle();

  if (error || !data) {
    throw notFound("User paper not found");
  }
}

export async function assertCanReadPaperContext(
  userId: string,
  paperId: string,
): Promise<void> {
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("papers")
    .select("id")
    .eq("id", paperId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    throw notFound("Paper not found");
  }

  const { data: ownPaper, error: ownPaperError } = await serviceClient
    .from("user_papers")
    .select("id")
    .eq("paper_id", paperId)
    .eq("user_id", userId)
    .is("removed_at", null)
    .maybeSingle();

  if (ownPaperError) {
    throw ownPaperError;
  }

  if (ownPaper) {
    return;
  }

  const { data: visibleUserPapers, error: visibleUserPapersError } =
    await serviceClient
      .from("user_papers")
      .select("user_id")
      .eq("paper_id", paperId)
      .is("removed_at", null);

  if (visibleUserPapersError) {
    throw visibleUserPapersError;
  }

  const followedUserIds = visibleUserPapers
    .map((userPaper) => userPaper.user_id)
    .filter((followedUserId) => followedUserId !== userId);
  const activeFollowedUserIds = [
    ...(await getActiveBetaUserIds(serviceClient, followedUserIds)),
  ];

  if (activeFollowedUserIds.length === 0) {
    throw forbidden("Paper context is not visible to this user");
  }

  const { data: followedPaper, error: followedPaperError } = await serviceClient
    .from("follows")
    .select("followed_user_id")
    .eq("follower_user_id", userId)
    .in("followed_user_id", activeFollowedUserIds)
    .limit(1)
    .maybeSingle();

  if (followedPaperError || !followedPaper) {
    throw forbidden("Paper context is not visible to this user");
  }
}
