import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { requireUser } from "@/lib/server/auth";

export const GET = withApiRoute(async (request) => {
  const user = await requireUser(request);

  return ok({ userId: user.id });
});
