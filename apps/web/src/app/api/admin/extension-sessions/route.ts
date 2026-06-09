import { z } from "zod";
import { notFound } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { requireAdmin } from "@/lib/server/auth";
import { createServiceRoleClient } from "@/lib/server/supabase";

const revokeSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

export const GET = withApiRoute(async (request) => {
  await requireAdmin(request);
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("extension_sessions")
    .select(
      "id,user_id,created_at,last_used_at,revoked_at,user_agent,extension_version",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  return ok({ sessions: data ?? [] });
});

export const POST = withApiRoute(async (request) => {
  await requireAdmin(request);
  const input = await parseJsonBody(request, revokeSessionSchema);
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("extension_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", input.sessionId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw notFound("Extension session not found");
  }

  return ok({ revoked: true, sessionId: input.sessionId });
});
