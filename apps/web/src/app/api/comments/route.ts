import { visibleCommentMaxLength } from "@cairn/shared";
import { z } from "zod";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { assertOwnsUserPaper, requireUser } from "@/lib/server/auth";
import { trackEvent } from "@/lib/server/analytics";
import { createServiceRoleClient } from "@/lib/server/supabase";

const visibleCommentSchema = z.object({
  userPaperId: z.string().uuid(),
  visibleComment: z.string().max(visibleCommentMaxLength).nullable(),
});

export const POST = withApiRoute(async (request) => {
  const user = await requireUser(request);
  const input = await parseJsonBody(request, visibleCommentSchema);
  await assertOwnsUserPaper(user.id, input.userPaperId);

  const serviceClient = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data: existing, error: existingError } = await serviceClient
    .from("user_papers")
    .select("visible_comment")
    .eq("id", input.userPaperId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const wasEmpty = !existing?.visible_comment;
  const { error } = await serviceClient
    .from("user_papers")
    .update({
      visible_comment: input.visibleComment,
      comment_updated_at: now,
    })
    .eq("id", input.userPaperId);

  if (error) {
    throw error;
  }

  if (wasEmpty && input.visibleComment) {
    await trackEvent({
      userId: user.id,
      eventName: "visible_comment_created",
      entityType: "user_paper",
      entityId: input.userPaperId,
    });
  }

  return ok({ saved: true, userPaperId: input.userPaperId });
});
