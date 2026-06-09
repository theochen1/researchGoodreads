import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { requireAdmin } from "@/lib/server/auth";
import { createServiceRoleClient } from "@/lib/server/supabase";

export const GET = withApiRoute(async (request) => {
  await requireAdmin(request);
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("papers")
    .select(
      "id,title,source_type,authors,year,abstract,venue,canonical_url,pdf_url,doi,arxiv_id,openreview_id,semantic_scholar_id,updated_at",
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  return ok({ papers: data ?? [] });
});
