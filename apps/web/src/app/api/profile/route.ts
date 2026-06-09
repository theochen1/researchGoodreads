import { z } from "zod";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { requireUser } from "@/lib/server/auth";
import { createServiceRoleClient } from "@/lib/server/supabase";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  username: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores"),
  affiliation: z.string().trim().max(160).nullable().optional(),
  role: z.string().trim().max(120).nullable().optional(),
});

export const GET = withApiRoute(async (request) => {
  const user = await requireUser(request);
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("profiles")
    .select("id,name,username,affiliation,role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return ok({ profile: data });
});

export const PATCH = withApiRoute(async (request) => {
  const user = await requireUser(request);
  const input = await parseJsonBody(request, profileSchema);
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("profiles")
    .update({
      name: input.name,
      username: input.username,
      affiliation: input.affiliation || null,
      role: input.role || null,
    })
    .eq("id", user.id)
    .select("id,name,username,affiliation,role")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return ok({ profile: data });
});
