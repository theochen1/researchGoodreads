import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { requireAdmin } from "@/lib/server/auth";

export const GET = withApiRoute(async (request) => {
  const user = await requireAdmin(request);

  return ok({ userId: user.id, admin: true });
});
