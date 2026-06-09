import { z } from "zod";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { requireAdmin } from "@/lib/server/auth";
import { createServiceRoleClient } from "@/lib/server/supabase";

const inviteUserSchema = z.object({
  email: z.string().email(),
  isAdmin: z.boolean().optional().default(false),
});

export const GET = withApiRoute(async (request) => {
  await requireAdmin(request);
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("beta_access")
    .select(
      "id,email,approved_at,invited_at,accepted_at,expires_at,is_admin,updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  return ok({ users: data ?? [] });
});

export const POST = withApiRoute(async (request) => {
  await requireAdmin(request);
  const input = await parseJsonBody(request, inviteUserSchema);
  const email = input.email.trim().toLowerCase();
  const serviceClient = createServiceRoleClient();
  const { data: existingRows, error: existingError } = await serviceClient
    .from("beta_access")
    .select("id")
    .ilike("email", email)
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  if (existingRows?.[0]) {
    const { error } = await serviceClient
      .from("beta_access")
      .update({
        approved_at: new Date().toISOString(),
        expires_at: null,
        is_admin: input.isAdmin,
      })
      .eq("id", existingRows[0].id);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await serviceClient.from("beta_access").insert({
      email,
      approved_at: new Date().toISOString(),
      is_admin: input.isAdmin,
    });

    if (error) {
      throw error;
    }
  }

  return ok({ email, approved: true, admin: input.isAdmin });
});
