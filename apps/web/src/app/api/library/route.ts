import { z } from "zod";
import { readingStateSchema } from "@cairn/shared";
import { notFound } from "@/lib/api/errors";
import { parseBoundedLimit } from "@/lib/api/query";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { assertOwnsUserPaper, requireUser } from "@/lib/server/auth";
import { trackEvent } from "@/lib/server/analytics";
import { getProjectsForUserPaperIds } from "@/lib/server/projects";
import { createServiceRoleClient } from "@/lib/server/supabase";

const removeSchema = z.object({
  userPaperId: z.string().uuid(),
});

type LibraryCursor = {
  sortValue: string;
  userPaperId: string;
};

function parseCursor(value: string | null): LibraryCursor | null {
  if (!value) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );

    if (
      typeof decoded.sortValue === "string" &&
      typeof decoded.userPaperId === "string"
    ) {
      return decoded;
    }
  } catch {
    return null;
  }

  return null;
}

function encodeCursor(cursor: LibraryCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export const GET = withApiRoute(async (request) => {
  const user = await requireUser(request);
  const requestUrl = new URL(request.url);
  const state = requestUrl.searchParams.get("state");
  const sort =
    requestUrl.searchParams.get("sort") === "added" ? "added" : "updated";
  const cursor = parseCursor(requestUrl.searchParams.get("cursor"));
  const sortColumn = sort === "added" ? "added_at" : "latest_visible_at";
  const limit = parseBoundedLimit(requestUrl.searchParams.get("limit"), {
    defaultLimit: 50,
    maxLimit: 100,
  });
  const stateFilter = state ? readingStateSchema.safeParse(state) : null;
  const serviceClient = createServiceRoleClient();
  let query = serviceClient
    .from("user_papers")
    .select(
      "id,paper_id,reading_state,recommendation_signal,visible_comment,added_at,state_updated_at,signal_updated_at,comment_updated_at,latest_visible_at,papers(id,title,authors,year,venue,abstract,source_type,canonical_url,pdf_url)",
    )
    .eq("user_id", user.id)
    .is("removed_at", null)
    .limit(limit);

  if (stateFilter?.success) {
    query = query.eq("reading_state", stateFilter.data);
  }

  if (cursor) {
    query = query.or(
      `${sortColumn}.lt.${cursor.sortValue},and(${sortColumn}.eq.${cursor.sortValue},id.lt.${cursor.userPaperId})`,
    );
  }

  query = query
    .order(sortColumn, { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const pageRows = (data ?? []).slice(0, limit);
  const paperIds = pageRows.map((row) => row.paper_id);
  const { data: noteRows, error: noteError } =
    paperIds.length > 0
      ? await serviceClient
          .from("private_notes")
          .select("paper_id")
          .eq("user_id", user.id)
          .in("paper_id", paperIds)
          .is("archived_at", null)
      : { data: [], error: null };

  if (noteError) {
    throw noteError;
  }

  const paperIdsWithNotes = new Set(
    (noteRows ?? []).map((row) => row.paper_id),
  );
  const projectMemberships = await getProjectsForUserPaperIds(
    user.id,
    pageRows.map((row) => row.id),
  );
  const lastRow = pageRows.at(-1);
  const nextCursor =
    (data ?? []).length > limit && lastRow
      ? encodeCursor({
          sortValue: lastRow[sortColumn],
          userPaperId: lastRow.id,
        })
      : null;

  return ok({
    items: pageRows.map((row) => ({
      ...row,
      hasPrivateNote: paperIdsWithNotes.has(row.paper_id),
      projects: projectMemberships.get(row.id) ?? [],
    })),
    nextCursor,
  });
});

export const DELETE = withApiRoute(async (request) => {
  const user = await requireUser(request);
  const input = await parseJsonBody(request, removeSchema);
  await assertOwnsUserPaper(user.id, input.userPaperId);

  const serviceClient = createServiceRoleClient();
  const { data: userPaper, error: userPaperError } = await serviceClient
    .from("user_papers")
    .select("id,paper_id")
    .eq("id", input.userPaperId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (userPaperError || !userPaper) {
    throw notFound("User paper not found");
  }

  const removedAt = new Date().toISOString();
  const { error: removeError } = await serviceClient
    .from("user_papers")
    .update({ removed_at: removedAt })
    .eq("id", input.userPaperId);

  if (removeError) {
    throw removeError;
  }

  const { error: noteError } = await serviceClient
    .from("private_notes")
    .update({ archived_at: removedAt })
    .eq("user_id", user.id)
    .eq("paper_id", userPaper.paper_id)
    .is("archived_at", null);

  if (noteError) {
    throw noteError;
  }

  const { error: projectMembershipError } = await serviceClient
    .from("project_papers")
    .delete()
    .eq("user_paper_id", input.userPaperId);

  if (projectMembershipError) {
    throw projectMembershipError;
  }

  await trackEvent({
    userId: user.id,
    eventName: "paper_removed",
    entityType: "paper",
    entityId: userPaper.paper_id,
  });

  return ok({ removed: true, userPaperId: input.userPaperId });
});
