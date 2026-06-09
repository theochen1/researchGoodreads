import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { requireUser } from "@/lib/server/auth";
import { createOpaqueSecret, sha256Hex } from "@/lib/server/crypto";
import { createServiceRoleClient } from "@/lib/server/supabase";

export const POST = withApiRoute(async (request) => {
  const user = await requireUser(request);
  const code = createOpaqueSecret();
  const codeHash = sha256Hex(code);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient.from("extension_auth_codes").insert({
    user_id: user.id,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  if (error) {
    throw error;
  }

  return ok({ code, expiresAt });
});
