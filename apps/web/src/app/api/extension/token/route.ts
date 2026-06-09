import { z } from "zod";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { trackEvent } from "@/lib/server/analytics";
import {
  createOpaqueSecret,
  hashExtensionToken,
  sha256Hex,
} from "@/lib/server/crypto";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { unauthorized } from "@/lib/api/errors";

const tokenExchangeSchema = z.object({
  code: z.string().min(1),
  extensionVersion: z.string().optional(),
});

export const POST = withApiRoute(async (request) => {
  const input = await parseJsonBody(request, tokenExchangeSchema);
  const serviceClient = createServiceRoleClient();
  const codeHash = sha256Hex(input.code);
  const now = new Date().toISOString();
  const { data: authCode, error: authCodeError } = await serviceClient
    .from("extension_auth_codes")
    .update({ consumed_at: now })
    .eq("code_hash", codeHash)
    .is("consumed_at", null)
    .gt("expires_at", now)
    .select("id,user_id")
    .maybeSingle();

  if (authCodeError || !authCode) {
    throw unauthorized("Invalid or expired extension auth code");
  }

  const token = createOpaqueSecret();
  const tokenHash = hashExtensionToken(token);
  const { data: session, error: sessionError } = await serviceClient
    .from("extension_sessions")
    .insert({
      user_id: authCode.user_id,
      token_hash: tokenHash,
      user_agent: request.headers.get("user-agent"),
      extension_version: input.extensionVersion ?? null,
    })
    .select("id")
    .single();

  if (sessionError) {
    throw sessionError;
  }

  await trackEvent({
    userId: authCode.user_id,
    eventName: "extension_connected",
    entityType: "extension_session",
    entityId: session.id,
  });

  return ok({ token, sessionId: session.id });
});
