import type { ParsedPaperInput } from "./capture";

export type OpenReviewMetadata = {
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  canonicalUrl: string;
  pdfUrl: string;
  openreviewId: string;
  sourceType: "openreview";
};

type OpenReviewContentValue<T> = {
  value?: T;
};

type OpenReviewNote = {
  id?: string;
  forum?: string;
  number?: number;
  invitation?: string;
  cdate?: number;
  content?: {
    title?: string | OpenReviewContentValue<string>;
    authors?: string[] | OpenReviewContentValue<string[]>;
    venue?: string | OpenReviewContentValue<string>;
    venueid?: string | OpenReviewContentValue<string>;
    year?: number | string | OpenReviewContentValue<number | string>;
    pdf?: string | OpenReviewContentValue<string>;
  };
};

type OpenReviewResponse = {
  notes?: OpenReviewNote[];
};

function contentValue<T>(
  value: T | OpenReviewContentValue<T> | undefined,
): T | undefined {
  if (value && typeof value === "object" && "value" in value) {
    return value.value;
  }

  return value as T | undefined;
}

function yearFromNote(note: OpenReviewNote): number | null {
  const rawYear = contentValue(note.content?.year);

  if (typeof rawYear === "number") {
    return rawYear;
  }

  if (typeof rawYear === "string") {
    const parsed = Number(rawYear);

    return Number.isFinite(parsed) ? parsed : null;
  }

  if (note.cdate) {
    return new Date(note.cdate).getUTCFullYear();
  }

  return null;
}

function pdfUrlFromNote(note: OpenReviewNote, openreviewId: string): string {
  const pdf = contentValue(note.content?.pdf);

  if (pdf?.startsWith("http")) {
    return pdf;
  }

  if (pdf?.startsWith("/")) {
    return `https://openreview.net${pdf}`;
  }

  return `https://openreview.net/pdf?id=${openreviewId}`;
}

export function metadataFromOpenReviewNote(
  note: OpenReviewNote,
  requestedOpenReviewId: string,
): OpenReviewMetadata | null {
  const title = contentValue(note.content?.title);
  const openreviewId = note.forum ?? note.id ?? requestedOpenReviewId;

  if (!title || !openreviewId) {
    return null;
  }

  return {
    title,
    authors: contentValue(note.content?.authors) ?? [],
    year: yearFromNote(note),
    venue:
      contentValue(note.content?.venue) ??
      contentValue(note.content?.venueid) ??
      null,
    canonicalUrl: `https://openreview.net/forum?id=${openreviewId}`,
    pdfUrl: pdfUrlFromNote(note, openreviewId),
    openreviewId,
    sourceType: "openreview",
  };
}

export async function resolveOpenReviewMetadata(
  parsedInput: ParsedPaperInput,
  timeoutMs = 5000,
): Promise<OpenReviewMetadata | null> {
  if (!parsedInput.openreviewId) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const params = new URLSearchParams({ forum: parsedInput.openreviewId });
    const response = await fetch(
      `https://api2.openreview.net/notes?${params.toString()}`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as OpenReviewResponse;
    const note = body.notes?.[0];

    return note
      ? metadataFromOpenReviewNote(note, parsedInput.openreviewId)
      : null;
  } finally {
    clearTimeout(timeout);
  }
}
