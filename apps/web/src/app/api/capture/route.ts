import {
  addedViaSchema,
  readingStateSchema,
  sourceTypeSchema,
} from "@cairn/shared";
import { z } from "zod";
import { ok } from "@/lib/api/response";
import { withApiRoute } from "@/lib/api/route";
import { parseJsonBody } from "@/lib/api/validation";
import { requireUser } from "@/lib/server/auth";
import {
  draftFromExistingPaper,
  draftFromParsedAndMetadata,
  findExistingPaper,
  resolveMetadataBestEffort,
  saveCapturedPaper,
} from "@/lib/server/capture-service";
import { parsePaperInput } from "@/lib/server/capture";

const resolveCaptureSchema = z.object({
  intent: z.literal("resolve"),
  input: z.string().min(1),
});

const saveCaptureSchema = z.object({
  intent: z.literal("save"),
  input: z.string().min(1).optional(),
  readingState: readingStateSchema,
  addedVia: addedViaSchema.optional(),
  paper: z.object({
    title: z.string().min(1),
    sourceType: sourceTypeSchema.optional(),
    authors: z.array(z.string().min(1)).optional(),
    year: z.number().int().min(1500).max(3000).nullable().optional(),
    abstract: z.string().nullable().optional(),
    venue: z.string().nullable().optional(),
    canonicalUrl: z.string().url().nullable().optional(),
    pdfUrl: z.string().url().nullable().optional(),
    doi: z.string().nullable().optional(),
    arxivId: z.string().nullable().optional(),
    openreviewId: z.string().nullable().optional(),
    semanticScholarId: z.string().nullable().optional(),
  }),
});

const captureSchema = z.discriminatedUnion("intent", [
  resolveCaptureSchema,
  saveCaptureSchema,
]);

export const POST = withApiRoute(async (request) => {
  const user = await requireUser(request);
  const input = await parseJsonBody(request, captureSchema);

  if (input.intent === "resolve") {
    const parsedInput = parsePaperInput(input.input);
    const existingPaper = await findExistingPaper(parsedInput);
    const resolvedMetadata = existingPaper
      ? null
      : await resolveMetadataBestEffort(parsedInput, user.id);

    return ok({
      parsedInput,
      existingPaper,
      draft: existingPaper
        ? draftFromExistingPaper(existingPaper)
        : draftFromParsedAndMetadata(parsedInput, resolvedMetadata),
    });
  }

  const parsedInput = parsePaperInput(input.input ?? input.paper.title);
  const addedVia = input.addedVia ?? (parsedInput.isUrl ? "web" : "manual");
  const result = await saveCapturedPaper({
    userId: user.id,
    rawInput: input.input ?? input.paper.title,
    readingState: input.readingState,
    addedVia,
    paper: input.paper,
  });

  return ok(result);
});
