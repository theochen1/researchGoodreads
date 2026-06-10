import { z } from "zod";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { requireUser } from "@/lib/server/auth";
import {
  getProjectForUser,
  listProjectPapersForUser,
  listProjectsForUser,
} from "@/lib/server/projects";
import { createServiceRoleClient } from "@/lib/server/supabase";

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600).nullable().optional(),
});

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export const GET = withApiRoute(
  async (request: Request, context: RouteContext) => {
    const user = await requireUser(request);
    const projectId = (await context.params).projectId;
    const project = await getProjectForUser(user.id, projectId);
    const items = await listProjectPapersForUser(user.id, projectId);
    const projects = await listProjectsForUser(user.id);
    const projectSummary = projects.find((entry) => entry.id === projectId);

    return ok({
      project: {
        ...project,
        paperCount: projectSummary?.paperCount ?? items.length,
      },
      items,
    });
  },
);

export const PATCH = withApiRoute(
  async (request: Request, context: RouteContext) => {
    const user = await requireUser(request);
    const projectId = (await context.params).projectId;
    await getProjectForUser(user.id, projectId);
    const input = await parseJsonBody(request, updateProjectSchema);
    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient
      .from("projects")
      .update({
        name: input.name,
        description: input.description || null,
      })
      .eq("id", projectId)
      .eq("user_id", user.id)
      .select("id,name,description,created_at,updated_at")
      .single();

    if (error) {
      throw error;
    }

    return ok({ project: data });
  },
);

export const DELETE = withApiRoute(
  async (request: Request, context: RouteContext) => {
    const user = await requireUser(request);
    const projectId = (await context.params).projectId;
    await getProjectForUser(user.id, projectId);
    const serviceClient = createServiceRoleClient();
    const { error } = await serviceClient
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    return ok({ deleted: true, projectId });
  },
);
