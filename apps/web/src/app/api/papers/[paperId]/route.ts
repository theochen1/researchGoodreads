import { z } from "zod";
import { readingStateSchema } from "@cairn/shared";
import { notFound } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { requireUser } from "@/lib/server/auth";
import {
  captureUpdateForExistingUserPaper,
  emitPaperAddedEvents,
} from "@/lib/server/capture-service";
import { trackEvent } from "@/lib/server/analytics";
import { getActiveBetaUserIds } from "@/lib/server/access";
import { createServiceRoleClient } from "@/lib/server/supabase";

const savePaperSchema = z.object({
  readingState: readingStateSchema.optional().default("want_to_read"),
});

type RouteContext = {
  params: Promise<{
    paperId: string;
  }>;
};

export const GET = withApiRoute(
  async (request: Request, context: RouteContext) => {
    const user = await requireUser(request);
    const paperId = (await context?.params)?.paperId;

    if (!paperId) {
      throw notFound("Paper not found");
    }

    const serviceClient = createServiceRoleClient();
    const { data: paper, error: paperError } = await serviceClient
      .from("papers")
      .select(
        "id,title,source_type,authors,year,abstract,venue,canonical_url,doi,arxiv_id,openreview_id,semantic_scholar_id,pdf_url,created_at,updated_at",
      )
      .eq("id", paperId)
      .is("deleted_at", null)
      .maybeSingle();

    if (paperError) {
      throw paperError;
    }

    if (!paper) {
      const { data: merge, error: mergeError } = await serviceClient
        .from("paper_merges")
        .select("surviving_paper_id")
        .eq("duplicate_paper_id", paperId)
        .maybeSingle();

      if (mergeError) {
        throw mergeError;
      }

      if (merge?.surviving_paper_id) {
        return ok({ redirectPaperId: merge.surviving_paper_id });
      }

      throw notFound("Paper not found");
    }

    const { data: userPaper, error: userPaperError } = await serviceClient
      .from("user_papers")
      .select(
        "id,reading_state,recommendation_signal,visible_comment,added_at,state_updated_at,signal_updated_at,comment_updated_at",
      )
      .eq("paper_id", paperId)
      .eq("user_id", user.id)
      .is("removed_at", null)
      .maybeSingle();

    if (userPaperError) {
      throw userPaperError;
    }

    const { data: privateNote, error: privateNoteError } = userPaper
      ? await serviceClient
          .from("private_notes")
          .select("id,body,created_at,updated_at")
          .eq("paper_id", paperId)
          .eq("user_id", user.id)
          .is("archived_at", null)
          .maybeSingle()
      : { data: null, error: null };

    if (privateNoteError) {
      throw privateNoteError;
    }

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
    const { data: followedUserPapers, error: followedUserPapersError } =
      activeFollowedUserIds.length > 0
        ? await serviceClient
            .from("user_papers")
            .select(
              "id,user_id,reading_state,recommendation_signal,visible_comment,state_updated_at,signal_updated_at,comment_updated_at",
            )
            .eq("paper_id", paperId)
            .in("user_id", activeFollowedUserIds)
            .is("removed_at", null)
        : { data: [], error: null };

    if (followedUserPapersError) {
      throw followedUserPapersError;
    }

    const contextUserIds = (followedUserPapers ?? []).map((row) => row.user_id);
    const { data: profiles, error: profilesError } =
      contextUserIds.length > 0
        ? await serviceClient
            .from("profiles")
            .select("id,name,username,affiliation,role")
            .in("id", contextUserIds)
        : { data: [], error: null };

    if (profilesError) {
      throw profilesError;
    }

    const profilesById = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile]),
    );

    return ok({
      paper,
      userPaper,
      privateNote,
      followedContext: (followedUserPapers ?? []).map((row) => ({
        ...row,
        profile: profilesById.get(row.user_id) ?? null,
      })),
    });
  },
);

export const POST = withApiRoute(
  async (request: Request, context: RouteContext) => {
    const user = await requireUser(request);
    const paperId = (await context?.params)?.paperId;

    if (!paperId) {
      throw notFound("Paper not found");
    }

    const input = await parseJsonBody(request, savePaperSchema);
    const serviceClient = createServiceRoleClient();
    const { data: paper, error: paperError } = await serviceClient
      .from("papers")
      .select("id")
      .eq("id", paperId)
      .is("deleted_at", null)
      .maybeSingle();

    if (paperError || !paper) {
      throw notFound("Paper not found");
    }

    const { data: existingUserPaper, error: existingUserPaperError } =
      await serviceClient
        .from("user_papers")
        .select("id,reading_state,removed_at")
        .eq("paper_id", paperId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (existingUserPaperError) {
      throw existingUserPaperError;
    }

    if (existingUserPaper) {
      const { patch, shouldEmitPaperAdded, shouldEmitReadingStateUpdated } =
        captureUpdateForExistingUserPaper({
          existingUserPaper,
          readingState: input.readingState,
          addedVia: "web",
          now: new Date().toISOString(),
        });
      const { error } = await serviceClient
        .from("user_papers")
        .update(patch)
        .eq("id", existingUserPaper.id);

      if (error) {
        throw error;
      }

      if (shouldEmitPaperAdded) {
        await emitPaperAddedEvents({
          userId: user.id,
          paperId,
          addedVia: "web",
        });
      } else if (shouldEmitReadingStateUpdated) {
        await trackEvent({
          userId: user.id,
          eventName: "reading_state_updated",
          entityType: "user_paper",
          entityId: existingUserPaper.id,
        });
      }

      return ok({ userPaperId: existingUserPaper.id, saved: true });
    }

    const { data, error } = await serviceClient
      .from("user_papers")
      .insert({
        user_id: user.id,
        paper_id: paperId,
        reading_state: input.readingState,
        added_via: "web",
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    await emitPaperAddedEvents({
      userId: user.id,
      paperId,
      addedVia: "web",
    });

    return ok({ userPaperId: data.id, saved: true });
  },
);
