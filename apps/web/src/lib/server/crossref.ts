import type { ParsedPaperInput } from "./capture";

export type CrossrefMetadata = {
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  canonicalUrl: string;
  doi: string;
  sourceType: "doi";
};

type CrossrefAuthor = {
  given?: string;
  family?: string;
  name?: string;
};

type CrossrefWork = {
  DOI?: string;
  title?: string[];
  author?: CrossrefAuthor[];
  published?: { "date-parts"?: number[][] };
  "published-print"?: { "date-parts"?: number[][] };
  "published-online"?: { "date-parts"?: number[][] };
  "container-title"?: string[];
  URL?: string;
};

type CrossrefResponse = {
  message?: CrossrefWork;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function authorName(author: CrossrefAuthor): string | null {
  if (author.name) {
    return normalizeWhitespace(author.name);
  }

  const name = [author.given, author.family].filter(Boolean).join(" ");

  return name ? normalizeWhitespace(name) : null;
}

function yearFromWork(work: CrossrefWork): number | null {
  const dateParts =
    work.published?.["date-parts"] ??
    work["published-print"]?.["date-parts"] ??
    work["published-online"]?.["date-parts"];

  return dateParts?.[0]?.[0] ?? null;
}

export function metadataFromCrossrefWork(
  work: CrossrefWork,
): CrossrefMetadata | null {
  const doi = work.DOI?.toLowerCase();
  const title = work.title?.[0];

  if (!doi || !title) {
    return null;
  }

  return {
    title: normalizeWhitespace(title),
    authors: (work.author ?? [])
      .map(authorName)
      .filter((name): name is string => Boolean(name)),
    year: yearFromWork(work),
    venue: work["container-title"]?.[0] ?? null,
    canonicalUrl: work.URL ?? `https://doi.org/${doi}`,
    doi,
    sourceType: "doi",
  };
}

export async function resolveCrossrefMetadata(
  parsedInput: ParsedPaperInput,
  timeoutMs = 5000,
): Promise<CrossrefMetadata | null> {
  if (!parsedInput.doi) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(parsedInput.doi)}`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as CrossrefResponse;

    return body.message ? metadataFromCrossrefWork(body.message) : null;
  } finally {
    clearTimeout(timeout);
  }
}
