import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { requireAdmin } from "@/lib/server/auth";
import { getBetaMetrics } from "@/lib/server/beta-metrics";

export const GET = withApiRoute(async (request) => {
  await requireAdmin(request);
  const metrics = await getBetaMetrics();

  return ok(metrics);
});
