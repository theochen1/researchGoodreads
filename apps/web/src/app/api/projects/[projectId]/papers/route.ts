import { z } from "zod";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { assertOwnsUserPaper, requireUser } from "@/lib/server/auth";
import { getProjectForUser } from "@/lib/server/projects";
import { createServiceRoleClient } from "@/lib/server/supabase";

const projectPaperSchema = z.object({
  userPaperId: z.string().uuid(),
});

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export const POST = withApiRoute(
  async (request: Request, context: RouteContext) => {
    const user = await requireUser(request);
    const projectId = (await context.params).projectId;
    await getProjectForUser(user.id, projectId);
    const input = await parseJsonBody(request, projectPaperSchema);
    await assertOwnsUserPaper(user.id, input.userPaperId);
    const serviceClient = createServiceRoleClient();
    const { error } = await serviceClient.from("project_papers").upsert({
      project_id: projectId,
      user_paper_id: input.userPaperId,
    });

    if (error) {
      throw error;
    }

    return ok({ added: true, projectId, userPaperId: input.userPaperId });
  },
);

export const DELETE = withApiRoute(
  async (request: Request, context: RouteContext) => {
    const user = await requireUser(request);
    const projectId = (await context.params).projectId;
    await getProjectForUser(user.id, projectId);
    const input = await parseJsonBody(request, projectPaperSchema);
    await assertOwnsUserPaper(user.id, input.userPaperId);
    const serviceClient = createServiceRoleClient();
    const { error } = await serviceClient
      .from("project_papers")
      .delete()
      .eq("project_id", projectId)
      .eq("user_paper_id", input.userPaperId);

    if (error) {
      throw error;
    }

    return ok({ removed: true, projectId, userPaperId: input.userPaperId });
  },
);
