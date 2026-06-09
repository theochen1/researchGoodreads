import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { requireExtensionSession } from "@/lib/server/auth";

export const GET = withApiRoute(async (request) => {
  const session = await requireExtensionSession(request);

  return ok({ extensionSessionId: session.id, userId: session.userId });
});
