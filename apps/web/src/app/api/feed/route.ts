import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseBoundedLimit } from "@/lib/api/query";
import { requireUser } from "@/lib/server/auth";
import { trackEvent } from "@/lib/server/analytics";
import { getActiveBetaUserIds } from "@/lib/server/access";
import { createServiceRoleClient } from "@/lib/server/supabase";

const readingStateLabels = {
  want_to_read: "Want to read",
  reading: "Reading",
  read: "Read",
  deep_read: "Deep read",
  skipped: "Skipped",
} as const;

const recommendationSignalLabels = {
  worth_reading: "Worth reading",
  worth_skimming: "Worth skimming",
  useful_reference: "Useful reference",
  not_worth_prioritizing: "Not worth prioritizing",
  unsure: "Unsure",
} as const;

type FeedCursor = {
  latestVisibleAt: string;
  userPaperId: string;
};

function deriveActivitySummary(row: {
  latest_visible_at: string;
  added_at: string;
  state_updated_at: string;
  signal_updated_at: string | null;
  comment_updated_at: string | null;
  visible_comment: string | null;
  reading_state: keyof typeof readingStateLabels;
  recommendation_signal: keyof typeof recommendationSignalLabels | null;
}) {
  if (row.latest_visible_at === row.added_at) {
    return `Added to library as ${readingStateLabels[row.reading_state]}`;
  }

  if (
    row.comment_updated_at &&
    row.latest_visible_at === row.comment_updated_at
  ) {
    return row.visible_comment
      ? "Added a visible comment"
      : "Cleared visible comment";
  }

  if (
    row.signal_updated_at &&
    row.latest_visible_at === row.signal_updated_at
  ) {
    return row.recommendation_signal
      ? `Set recommendation to ${recommendationSignalLabels[row.recommendation_signal]}`
      : "Cleared recommendation";
  }

  if (row.latest_visible_at === row.state_updated_at) {
    return `Updated reading status to ${readingStateLabels[row.reading_state]}`;
  }

  return `Updated reading status to ${readingStateLabels[row.reading_state]}`;
}

function parseCursor(value: string | null): FeedCursor | null {
  if (!value) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );

    if (
      typeof decoded.latestVisibleAt === "string" &&
      typeof decoded.userPaperId === "string"
    ) {
      return decoded;
    }
  } catch {
    return null;
  }

  return null;
}

function encodeCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export const GET = withApiRoute(async (request) => {
  const user = await requireUser(request);
  const requestUrl = new URL(request.url);
  const limit = parseBoundedLimit(requestUrl.searchParams.get("limit"), {
    defaultLimit: 30,
    maxLimit: 100,
  });
  const cursor = parseCursor(requestUrl.searchParams.get("cursor"));
  const serviceClient = createServiceRoleClient();
  const { data: follows, error: followsError } = await serviceClient
    .from("follows")
    .select("followed_user_id")
    .eq("follower_user_id", user.id);

  if (followsError) {
    throw followsError;
  }

  const followedUserIds = (follows ?? []).map(
    (follow) => follow.followed_user_id,
  );
  const activeFollowedUserIds = [
    ...(await getActiveBetaUserIds(serviceClient, followedUserIds)),
  ];

  if (activeFollowedUserIds.length === 0) {
    await trackEvent({
      userId: user.id,
      eventName: "following_feed_viewed",
      entityType: "feed",
      metadata: { itemCount: 0 },
    });

    return ok({ items: [], nextCursor: null });
  }

  let feedQuery = serviceClient
    .from("user_papers")
    .select(
      "id,user_id,paper_id,reading_state,recommendation_signal,visible_comment,added_at,state_updated_at,signal_updated_at,comment_updated_at,latest_visible_at,papers(id,title,authors,year,venue,source_type)",
    )
    .in("user_id", activeFollowedUserIds)
    .is("removed_at", null)
    .order("latest_visible_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    feedQuery = feedQuery.or(
      `latest_visible_at.lt.${cursor.latestVisibleAt},and(latest_visible_at.eq.${cursor.latestVisibleAt},id.lt.${cursor.userPaperId})`,
    );
  }

  const { data: rows, error: rowsError } = await feedQuery;

  if (rowsError) {
    throw rowsError;
  }

  const pageRows = (rows ?? []).slice(0, limit);
  const profileIds = [...new Set(pageRows.map((row) => row.user_id))];
  const { data: profiles, error: profilesError } =
    profileIds.length > 0
      ? await serviceClient
          .from("profiles")
          .select("id,name,username,affiliation,role")
          .in("id", profileIds)
      : { data: [], error: null };

  if (profilesError) {
    throw profilesError;
  }

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );
  const lastRow = pageRows.at(-1);
  const nextCursor =
    (rows ?? []).length > limit && lastRow
      ? encodeCursor({
          latestVisibleAt: lastRow.latest_visible_at,
          userPaperId: lastRow.id,
        })
      : null;

  await trackEvent({
    userId: user.id,
    eventName: "following_feed_viewed",
    entityType: "feed",
    metadata: { itemCount: pageRows.length },
  });

  return ok({
    items: pageRows.map((row) => ({
      id: row.id,
      latestVisibleAt: row.latest_visible_at,
      activitySummary: deriveActivitySummary(row),
      readingState: row.reading_state,
      recommendationSignal: row.recommendation_signal,
      visibleComment: row.visible_comment,
      paper: row.papers,
      profile: profilesById.get(row.user_id) ?? null,
    })),
    nextCursor,
  });
});
