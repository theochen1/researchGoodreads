import { recommendationSignalSchema, readingStateSchema } from "@cairn/shared";
import { z } from "zod";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { assertOwnsUserPaper, requireUser } from "@/lib/server/auth";
import { trackEvent } from "@/lib/server/analytics";
import { createServiceRoleClient } from "@/lib/server/supabase";

const updateUserPaperSchema = z
  .object({
    readingState: readingStateSchema.optional(),
    recommendationSignal: recommendationSignalSchema.nullable().optional(),
  })
  .refine(
    (input) =>
      input.readingState !== undefined ||
      Object.prototype.hasOwnProperty.call(input, "recommendationSignal"),
    "Provide a reading state or recommendation signal",
  );

type RouteContext = {
  params: Promise<{
    userPaperId: string;
  }>;
};

export const PATCH = withApiRoute(
  async (request: Request, context: RouteContext) => {
    const user = await requireUser(request);
    const userPaperId = (await context?.params)?.userPaperId;

    if (!userPaperId) {
      throw new Error("Missing user paper id");
    }

    await assertOwnsUserPaper(user.id, userPaperId);

    const input = await parseJsonBody(request, updateUserPaperSchema);
    const patch: Record<string, string | null> = {};
    const now = new Date().toISOString();

    if (input.readingState) {
      patch.reading_state = input.readingState;
      patch.state_updated_at = now;
    }

    if (Object.prototype.hasOwnProperty.call(input, "recommendationSignal")) {
      patch.recommendation_signal = input.recommendationSignal ?? null;
      patch.signal_updated_at = now;
    }

    const serviceClient = createServiceRoleClient();
    const { error } = await serviceClient
      .from("user_papers")
      .update(patch)
      .eq("id", userPaperId);

    if (error) {
      throw error;
    }

    if (input.readingState) {
      await trackEvent({
        userId: user.id,
        eventName: "reading_state_updated",
        entityType: "user_paper",
        entityId: userPaperId,
      });
    }

    if (input.recommendationSignal) {
      await trackEvent({
        userId: user.id,
        eventName: "recommendation_signal_set",
        entityType: "user_paper",
        entityId: userPaperId,
      });
    }

    return ok({ updated: true, userPaperId });
  },
);
