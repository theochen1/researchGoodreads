import { z } from "zod";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { requireUser } from "@/lib/server/auth";
import { listProjectsForUser } from "@/lib/server/projects";
import { createServiceRoleClient } from "@/lib/server/supabase";

const projectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600).nullable().optional(),
});

export const GET = withApiRoute(async (request) => {
  const user = await requireUser(request);
  const projects = await listProjectsForUser(user.id);

  return ok({ projects });
});

export const POST = withApiRoute(async (request) => {
  const user = await requireUser(request);
  const input = await parseJsonBody(request, projectSchema);
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("projects")
    .insert({
      user_id: user.id,
      name: input.name,
      description: input.description || null,
    })
    .select("id,name,description,created_at,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return ok({
    project: {
      ...data,
      paperCount: 0,
    },
  });
});
