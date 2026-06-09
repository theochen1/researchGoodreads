import { z } from "zod";
import { badRequest, notFound } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { requireUser } from "@/lib/server/auth";
import { trackEvent } from "@/lib/server/analytics";
import { getActiveBetaUserIds } from "@/lib/server/access";
import { createServiceRoleClient } from "@/lib/server/supabase";

const followSchema = z.object({
  followedUserId: z.string().uuid(),
});

async function assertFollowTargetIsActiveBetaUser(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  followedUserId: string,
): Promise<void> {
  const activeBetaUserIds = await getActiveBetaUserIds(serviceClient, [
    followedUserId,
  ]);

  if (!activeBetaUserIds.has(followedUserId)) {
    throw notFound("Beta user not found");
  }
}

export const GET = withApiRoute(async (request) => {
  const user = await requireUser(request);
  const requestUrl = new URL(request.url);
  const search = requestUrl.searchParams.get("q")?.trim();
  const serviceClient = createServiceRoleClient();
  const profileQuery = serviceClient
    .from("profiles")
    .select("id,name,username,affiliation,role,created_at")
    .neq("id", user.id)
    .order("name", { ascending: true })
    .limit(200);

  const { data: profiles, error: profilesError } = await profileQuery;

  if (profilesError) {
    throw profilesError;
  }

  const activeBetaUserIds = await getActiveBetaUserIds(
    serviceClient,
    (profiles ?? []).map((profile) => profile.id),
  );
  const activeProfiles = (profiles ?? []).filter((profile) =>
    activeBetaUserIds.has(profile.id),
  );
  const normalizedSearch = search?.toLowerCase();
  const visibleProfiles = normalizedSearch
    ? activeProfiles.filter((profile) =>
        [profile.name, profile.username, profile.affiliation]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(normalizedSearch)),
      )
    : activeProfiles;

  const { data: follows, error: followsError } = await serviceClient
    .from("follows")
    .select("followed_user_id")
    .eq("follower_user_id", user.id);

  if (followsError) {
    throw followsError;
  }

  const followedIds = new Set(
    (follows ?? []).map((follow) => follow.followed_user_id),
  );

  return ok({
    people: visibleProfiles.slice(0, 100).map((profile) => ({
      ...profile,
      isFollowed: followedIds.has(profile.id),
    })),
  });
});

export const POST = withApiRoute(async (request) => {
  const user = await requireUser(request);
  const input = await parseJsonBody(request, followSchema);

  if (input.followedUserId === user.id) {
    throw badRequest("Users cannot follow themselves");
  }

  const serviceClient = createServiceRoleClient();
  const { data: targetProfile, error: targetProfileError } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("id", input.followedUserId)
    .maybeSingle();

  if (targetProfileError) {
    throw targetProfileError;
  }

  if (!targetProfile) {
    throw notFound("Beta user not found");
  }

  await assertFollowTargetIsActiveBetaUser(serviceClient, input.followedUserId);

  const { error } = await serviceClient.from("follows").upsert({
    follower_user_id: user.id,
    followed_user_id: input.followedUserId,
  });

  if (error) {
    throw error;
  }

  await trackEvent({
    userId: user.id,
    eventName: "follow_created",
    entityType: "profile",
    entityId: input.followedUserId,
  });

  return ok({ followed: true, followedUserId: input.followedUserId });
});

export const DELETE = withApiRoute(async (request) => {
  const user = await requireUser(request);
  const input = await parseJsonBody(request, followSchema);
  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient
    .from("follows")
    .delete()
    .eq("follower_user_id", user.id)
    .eq("followed_user_id", input.followedUserId);

  if (error) {
    throw error;
  }

  return ok({ followed: false, followedUserId: input.followedUserId });
});
