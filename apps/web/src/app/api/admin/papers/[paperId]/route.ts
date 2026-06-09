import { sourceTypeSchema } from "@cairn/shared";
import { z } from "zod";
import { notFound } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { requireAdmin } from "@/lib/server/auth";
import { canonicalKeyForPaperFields } from "@/lib/server/capture";
import { createServiceRoleClient } from "@/lib/server/supabase";

const paperMetadataSchema = z.object({
  title: z.string().min(1).optional(),
  sourceType: sourceTypeSchema.optional(),
  authors: z.array(z.string().min(1)).nullable().optional(),
  year: z.number().int().min(1500).max(3000).nullable().optional(),
  abstract: z.string().nullable().optional(),
  venue: z.string().nullable().optional(),
  canonicalUrl: z.string().url().nullable().optional(),
  pdfUrl: z.string().url().nullable().optional(),
  doi: z.string().nullable().optional(),
  arxivId: z.string().nullable().optional(),
  openreviewId: z.string().nullable().optional(),
  semanticScholarId: z.string().nullable().optional(),
});

type RouteContext = {
  params: Promise<{
    paperId: string;
  }>;
};

export const PATCH = withApiRoute(
  async (request: Request, context: RouteContext) => {
    await requireAdmin(request);
    const { paperId } = await context.params;
    const input = await parseJsonBody(request, paperMetadataSchema);
    const serviceClient = createServiceRoleClient();
    const { data: existingPaper, error: existingPaperError } =
      await serviceClient
        .from("papers")
        .select(
          "id,title,year,canonical_url,doi,arxiv_id,openreview_id,semantic_scholar_id",
        )
        .eq("id", paperId)
        .is("deleted_at", null)
        .maybeSingle();

    if (existingPaperError || !existingPaper) {
      throw notFound("Paper not found");
    }

    const patch = {
      title: input.title,
      source_type: input.sourceType,
      authors: input.authors,
      year: input.year,
      abstract: input.abstract,
      venue: input.venue,
      canonical_url: input.canonicalUrl,
      pdf_url: input.pdfUrl,
      doi: input.doi,
      arxiv_id: input.arxivId,
      openreview_id: input.openreviewId,
      semantic_scholar_id: input.semanticScholarId,
      canonical_key: canonicalKeyForPaperFields({
        doi: input.doi !== undefined ? input.doi : existingPaper.doi,
        arxivId:
          input.arxivId !== undefined ? input.arxivId : existingPaper.arxiv_id,
        openreviewId:
          input.openreviewId !== undefined
            ? input.openreviewId
            : existingPaper.openreview_id,
        semanticScholarId:
          input.semanticScholarId !== undefined
            ? input.semanticScholarId
            : existingPaper.semantic_scholar_id,
        canonicalUrl:
          input.canonicalUrl !== undefined
            ? input.canonicalUrl
            : existingPaper.canonical_url,
        title: input.title !== undefined ? input.title : existingPaper.title,
        year: input.year !== undefined ? input.year : existingPaper.year,
      }),
    };
    const sanitizedPatch = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );
    const { data, error } = await serviceClient
      .from("papers")
      .update(sanitizedPatch)
      .eq("id", paperId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      throw notFound("Paper not found");
    }

    return ok({ paperId, updated: true });
  },
);
