import { z } from "zod";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { requireAdmin } from "@/lib/server/auth";
import { createServiceRoleClient } from "@/lib/server/supabase";

const mergePapersSchema = z.object({
  duplicatePaperId: z.string().uuid(),
  survivingPaperId: z.string().uuid(),
});

export const POST = withApiRoute(async (request) => {
  const admin = await requireAdmin(request);
  const input = await parseJsonBody(request, mergePapersSchema);
  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient.rpc("merge_duplicate_papers", {
    p_duplicate_paper_id: input.duplicatePaperId,
    p_surviving_paper_id: input.survivingPaperId,
    p_merged_by_user_id: admin.id,
  });

  if (error) {
    throw error;
  }

  return ok({
    merged: true,
    duplicatePaperId: input.duplicatePaperId,
    survivingPaperId: input.survivingPaperId,
  });
});
