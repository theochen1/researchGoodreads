import { readingStateSchema } from "@cairn/shared";
import { z } from "zod";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { requireExtensionSession } from "@/lib/server/auth";
import { parsePaperInput } from "@/lib/server/capture";
import {
  draftFromParsedAndMetadata,
  findExistingPaper,
  resolveMetadataBestEffort,
  saveCapturedPaper,
} from "@/lib/server/capture-service";

const extensionCaptureSchema = z.object({
  url: z.string().url(),
  readingState: readingStateSchema,
  manualTitle: z.string().min(1).optional(),
});

export const POST = withApiRoute(async (request) => {
  const session = await requireExtensionSession(request);
  const input = await parseJsonBody(request, extensionCaptureSchema);
  const parsedInput = parsePaperInput(input.url);
  const existingPaper = await findExistingPaper(parsedInput);
  const resolvedMetadata = existingPaper
    ? null
    : await resolveMetadataBestEffort(parsedInput, session.userId);
  const draft = draftFromParsedAndMetadata(parsedInput, resolvedMetadata);
  const title =
    existingPaper?.title ??
    resolvedMetadata?.title ??
    input.manualTitle ??
    titleFromDirectPdfUrl(input.url) ??
    "";

  if (!existingPaper && !title) {
    return ok({
      saved: false,
      needsManualFallback: true,
      manualUrl: `/add?input=${encodeURIComponent(input.url)}`,
    });
  }

  const result = await saveCapturedPaper({
    userId: session.userId,
    rawInput: input.url,
    readingState: input.readingState,
    addedVia: "extension",
    paper: {
      title,
      sourceType: existingPaper?.source_type ?? draft.sourceType,
      authors: draft.authors,
      year: draft.year,
      abstract: draft.abstract,
      venue: draft.venue,
      canonicalUrl: draft.canonicalUrl,
      pdfUrl: draft.pdfUrl,
      doi: draft.doi,
      arxivId: draft.arxivId,
      openreviewId: draft.openreviewId,
      semanticScholarId: draft.semanticScholarId,
    },
  });

  return ok({
    saved: true,
    needsManualFallback: false,
    paperId: result.paperId,
    paperUrl: `/papers/${result.paperId}`,
  });
});

function titleFromDirectPdfUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const finalPathPart = url.pathname.split("/").filter(Boolean).pop();

    if (!finalPathPart?.toLowerCase().endsWith(".pdf")) {
      return null;
    }

    return decodeURIComponent(finalPathPart)
      .replace(/\.pdf$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
  } catch {
    return null;
  }
}
