import type { AddedVia, ReadingState, SourceType } from "@cairn/shared";
import { type ResolvedPaperMetadata, resolveArxivMetadata } from "./arxiv";
import {
  canonicalKeyForPaperFields,
  canonicalKeyForParsedInput,
  parsePaperInput,
  type ParsedPaperInput,
} from "./capture";
import { type CrossrefMetadata, resolveCrossrefMetadata } from "./crossref";
import {
  type OpenReviewMetadata,
  resolveOpenReviewMetadata,
} from "./openreview";
import { trackEvent } from "./analytics";
import { createServiceRoleClient } from "./supabase";

export type ResolverMetadata =
  | ResolvedPaperMetadata
  | CrossrefMetadata
  | OpenReviewMetadata;

export type CapturePaperInput = {
  title: string;
  sourceType?: SourceType;
  authors?: string[];
  year?: number | null;
  abstract?: string | null;
  venue?: string | null;
  canonicalUrl?: string | null;
  pdfUrl?: string | null;
  doi?: string | null;
  arxivId?: string | null;
  openreviewId?: string | null;
  semanticScholarId?: string | null;
};

export type ExistingPaper = {
  id: string;
  title: string;
  source_type: SourceType;
  authors: string[] | null;
  year: number | null;
  abstract: string | null;
  venue: string | null;
  canonical_url: string | null;
  pdf_url: string | null;
  doi: string | null;
  arxiv_id: string | null;
  openreview_id: string | null;
  semantic_scholar_id: string | null;
};

export async function findExistingPaper(
  parsedInput: ParsedPaperInput,
): Promise<ExistingPaper | null> {
  const serviceClient = createServiceRoleClient();
  const canonicalKey = canonicalKeyForParsedInput(parsedInput);
  const queries = [
    parsedInput.doi ? { column: "doi", value: parsedInput.doi } : null,
    parsedInput.arxivId
      ? { column: "arxiv_id", value: parsedInput.arxivId }
      : null,
    parsedInput.openreviewId
      ? { column: "openreview_id", value: parsedInput.openreviewId }
      : null,
    parsedInput.semanticScholarId
      ? { column: "semantic_scholar_id", value: parsedInput.semanticScholarId }
      : null,
    parsedInput.canonicalUrl
      ? { column: "canonical_url", value: parsedInput.canonicalUrl }
      : null,
    canonicalKey ? { column: "canonical_key", value: canonicalKey } : null,
  ].filter(Boolean) as { column: string; value: string }[];

  for (const query of queries) {
    const { data, error } = await serviceClient
      .from("papers")
      .select(
        "id,title,source_type,authors,year,abstract,venue,canonical_url,pdf_url,doi,arxiv_id,openreview_id,semantic_scholar_id",
      )
      .eq(query.column, query.value)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data as ExistingPaper;
    }
  }

  return null;
}

export async function findExistingPaperByCanonicalKey(
  canonicalKey: string | null,
): Promise<ExistingPaper | null> {
  if (!canonicalKey) {
    return null;
  }

  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("papers")
    .select(
      "id,title,source_type,authors,year,abstract,venue,canonical_url,pdf_url,doi,arxiv_id,openreview_id,semantic_scholar_id",
    )
    .eq("canonical_key", canonicalKey)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ExistingPaper | null;
}

export async function findCurrentUserPaper(userId: string, paperId: string) {
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("user_papers")
    .select("id,reading_state")
    .eq("user_id", userId)
    .eq("paper_id", paperId)
    .is("removed_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function resolveMetadata(
  parsedInput: ParsedPaperInput,
): Promise<ResolverMetadata | null> {
  if (parsedInput.arxivId) {
    return resolveArxivMetadata(parsedInput);
  }

  if (parsedInput.doi) {
    return resolveCrossrefMetadata(parsedInput);
  }

  if (parsedInput.openreviewId) {
    return resolveOpenReviewMetadata(parsedInput);
  }

  return null;
}

export function resolverFailureMetadata(parsedInput: ParsedPaperInput) {
  return {
    sourceType: parsedInput.sourceType,
    arxivId: parsedInput.arxivId,
    doi: parsedInput.doi,
    openreviewId: parsedInput.openreviewId,
  };
}

export async function resolveMetadataBestEffort(
  parsedInput: ParsedPaperInput,
  userId?: string,
): Promise<ResolverMetadata | null> {
  if (!parsedInput.arxivId && !parsedInput.doi && !parsedInput.openreviewId) {
    if (parsedInput.isUrl && userId) {
      await trackEvent({
        userId,
        eventName: "metadata_resolution_failed",
        entityType: "paper_input",
        metadata: resolverFailureMetadata(parsedInput),
      });
    }

    return null;
  }

  try {
    const metadata = await resolveMetadata(parsedInput);

    if (!metadata && userId) {
      await trackEvent({
        userId,
        eventName: "metadata_resolution_failed",
        entityType: "paper_input",
        metadata: resolverFailureMetadata(parsedInput),
      });
    }

    return metadata;
  } catch {
    if (userId) {
      await trackEvent({
        userId,
        eventName: "metadata_resolution_failed",
        entityType: "paper_input",
        metadata: resolverFailureMetadata(parsedInput),
      });
    }

    return null;
  }
}

export function abstractFromMetadata(
  metadata: ResolverMetadata | null,
): string | null {
  return metadata && "abstract" in metadata ? metadata.abstract : null;
}

export function venueFromMetadata(metadata: ResolverMetadata | null) {
  return metadata && "venue" in metadata ? metadata.venue : null;
}

export function pdfUrlFromMetadata(metadata: ResolverMetadata | null) {
  return metadata && "pdfUrl" in metadata ? metadata.pdfUrl : null;
}

export function arxivIdFromMetadata(metadata: ResolverMetadata | null) {
  return metadata && "arxivId" in metadata ? metadata.arxivId : null;
}

export function openreviewIdFromMetadata(metadata: ResolverMetadata | null) {
  return metadata && "openreviewId" in metadata ? metadata.openreviewId : null;
}

export function draftFromParsedAndMetadata(
  parsedInput: ParsedPaperInput,
  metadata: ResolverMetadata | null,
) {
  return {
    title: metadata?.title ?? parsedInput.title ?? "",
    sourceType:
      metadata?.sourceType ??
      (parsedInput.sourceType === "unknown"
        ? "manual"
        : parsedInput.sourceType),
    authors: metadata?.authors ?? [],
    year: metadata?.year ?? null,
    abstract: abstractFromMetadata(metadata),
    venue: venueFromMetadata(metadata),
    canonicalUrl: metadata?.canonicalUrl ?? parsedInput.canonicalUrl ?? null,
    pdfUrl: pdfUrlFromMetadata(metadata) ?? parsedInput.pdfUrl ?? null,
    doi: parsedInput.doi ?? null,
    arxivId: arxivIdFromMetadata(metadata) ?? parsedInput.arxivId ?? null,
    openreviewId:
      openreviewIdFromMetadata(metadata) ?? parsedInput.openreviewId ?? null,
    semanticScholarId: parsedInput.semanticScholarId ?? null,
  };
}

export function draftFromExistingPaper(paper: ExistingPaper) {
  return {
    title: paper.title,
    sourceType: paper.source_type,
    authors: paper.authors ?? [],
    year: paper.year,
    abstract: paper.abstract,
    venue: paper.venue,
    canonicalUrl: paper.canonical_url,
    pdfUrl: paper.pdf_url,
    doi: paper.doi,
    arxivId: paper.arxiv_id,
    openreviewId: paper.openreview_id,
    semanticScholarId: paper.semantic_scholar_id,
  };
}

function sourceTypeFromInput(
  parsedInput: ParsedPaperInput,
  paper: CapturePaperInput,
) {
  return (
    paper.sourceType ??
    (parsedInput.sourceType === "unknown" ? "manual" : parsedInput.sourceType)
  );
}

export async function emitPaperAddedEvents({
  userId,
  paperId,
  addedVia,
}: {
  userId: string;
  paperId: string;
  addedVia: AddedVia;
}) {
  await trackEvent({
    userId,
    eventName: "paper_added",
    entityType: "paper",
    entityId: paperId,
    metadata: { addedVia },
  });

  if (addedVia === "extension" || addedVia === "web") {
    await trackEvent({
      userId,
      eventName:
        addedVia === "extension"
          ? "paper_added_from_extension"
          : "paper_added_from_web",
      entityType: "paper",
      entityId: paperId,
    });
  }
}

export type ExistingUserPaperForCapture = {
  reading_state: ReadingState;
  removed_at: string | null;
};

export function captureUpdateForExistingUserPaper({
  existingUserPaper,
  readingState,
  addedVia,
  capturedUrl,
  now,
}: {
  existingUserPaper: ExistingUserPaperForCapture;
  readingState: ReadingState;
  addedVia: AddedVia;
  capturedUrl?: string | null;
  now: string;
}) {
  const patch: {
    reading_state: ReadingState;
    state_updated_at: string;
    captured_url?: string | null;
    added_via?: AddedVia;
    removed_at?: null;
  } = {
    reading_state: readingState,
    state_updated_at: now,
  };

  if (capturedUrl !== undefined) {
    patch.captured_url = capturedUrl;
  }

  if (existingUserPaper.removed_at) {
    patch.added_via = addedVia;
    patch.removed_at = null;
  }

  return {
    patch,
    shouldEmitPaperAdded: Boolean(existingUserPaper.removed_at),
    shouldEmitReadingStateUpdated:
      !existingUserPaper.removed_at &&
      existingUserPaper.reading_state !== readingState,
  };
}

export async function saveCapturedPaper({
  userId,
  rawInput,
  readingState,
  addedVia,
  paper,
}: {
  userId: string;
  rawInput: string;
  readingState: ReadingState;
  addedVia: AddedVia;
  paper: CapturePaperInput;
}) {
  const parsedInput = parsePaperInput(rawInput);
  const canonicalKey = canonicalKeyForPaperFields({
    doi: paper.doi ?? parsedInput.doi,
    arxivId: paper.arxivId ?? parsedInput.arxivId,
    openreviewId: paper.openreviewId ?? parsedInput.openreviewId,
    semanticScholarId: paper.semanticScholarId ?? parsedInput.semanticScholarId,
    canonicalUrl: paper.canonicalUrl ?? parsedInput.canonicalUrl,
    title: paper.title,
    year: paper.year,
  });
  const existingPaper =
    (await findExistingPaper(parsedInput)) ??
    (await findExistingPaperByCanonicalKey(canonicalKey));
  const serviceClient = createServiceRoleClient();
  const paperId = existingPaper?.id ?? crypto.randomUUID();

  if (!existingPaper) {
    const { error } = await serviceClient.from("papers").insert({
      id: paperId,
      title: paper.title,
      source_type: sourceTypeFromInput(parsedInput, paper),
      authors: paper.authors ?? null,
      year: paper.year ?? null,
      abstract: paper.abstract ?? null,
      venue: paper.venue ?? null,
      canonical_url: paper.canonicalUrl ?? parsedInput.canonicalUrl ?? null,
      canonical_key: canonicalKey,
      doi: paper.doi ?? parsedInput.doi ?? null,
      arxiv_id: paper.arxivId ?? parsedInput.arxivId ?? null,
      openreview_id: paper.openreviewId ?? parsedInput.openreviewId ?? null,
      semantic_scholar_id:
        paper.semanticScholarId ?? parsedInput.semanticScholarId ?? null,
      pdf_url: paper.pdfUrl ?? parsedInput.pdfUrl ?? null,
    });

    if (error) {
      throw error;
    }
  }

  const { data: existingUserPaper, error: existingUserPaperError } =
    await serviceClient
      .from("user_papers")
      .select("id,reading_state,removed_at")
      .eq("user_id", userId)
      .eq("paper_id", paperId)
      .maybeSingle();

  if (existingUserPaperError) {
    throw existingUserPaperError;
  }

  if (existingUserPaper) {
    const now = new Date().toISOString();
    const { patch, shouldEmitPaperAdded, shouldEmitReadingStateUpdated } =
      captureUpdateForExistingUserPaper({
        existingUserPaper,
        readingState,
        addedVia,
        capturedUrl: parsedInput.isUrl ? parsedInput.rawInput : null,
        now,
      });
    const { error } = await serviceClient
      .from("user_papers")
      .update(patch)
      .eq("id", existingUserPaper.id);

    if (error) {
      throw error;
    }

    if (shouldEmitPaperAdded) {
      await emitPaperAddedEvents({ userId, paperId, addedVia });
    } else if (shouldEmitReadingStateUpdated) {
      await trackEvent({
        userId,
        eventName: "reading_state_updated",
        entityType: "user_paper",
        entityId: existingUserPaper.id,
      });
    }
  } else {
    const { error } = await serviceClient.from("user_papers").insert({
      user_id: userId,
      paper_id: paperId,
      reading_state: readingState,
      added_via: addedVia,
      captured_url: parsedInput.isUrl ? parsedInput.rawInput : null,
    });

    if (error) {
      throw error;
    }

    await emitPaperAddedEvents({ userId, paperId, addedVia });
  }

  return { paperId, saved: true };
}
