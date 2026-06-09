import type { SourceType } from "@cairn/shared";

export type ParsedPaperInput = {
  rawInput: string;
  isUrl: boolean;
  sourceType: SourceType;
  title?: string;
  canonicalUrl?: string;
  pdfUrl?: string;
  doi?: string;
  arxivId?: string;
  openreviewId?: string;
  semanticScholarId?: string;
};

export type CanonicalPaperKeyFields = {
  doi?: string | null;
  arxivId?: string | null;
  openreviewId?: string | null;
  semanticScholarId?: string | null;
  canonicalUrl?: string | null;
  title?: string | null;
  year?: number | null;
};

function parseUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function parseArxivId(url: URL): string | undefined {
  const match = url.pathname.match(
    /\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5})(v\d+)?/,
  );

  return match?.[1];
}

function parseOpenReviewId(url: URL): string | undefined {
  return (
    url.searchParams.get("id") ?? url.searchParams.get("forum") ?? undefined
  );
}

function parseSemanticScholarId(url: URL): string | undefined {
  const match = url.pathname.match(
    /\/paper\/(?:[^/]+\/)?([a-f0-9]{40}|[A-Za-z0-9_-]+)/,
  );

  return match?.[1];
}

function normalizeDoi(input: string): string | undefined {
  const doiMatch = input.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);

  return doiMatch?.[0]?.toLowerCase();
}

export function parsePaperInput(input: string): ParsedPaperInput {
  const rawInput = input.trim();
  const url = parseUrl(rawInput);

  if (!url) {
    const doi = normalizeDoi(rawInput);

    return {
      rawInput,
      isUrl: false,
      sourceType: doi ? "doi" : "manual",
      title: doi ? undefined : rawInput,
      doi,
    };
  }

  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();
  const doi = normalizeDoi(rawInput);

  if (hostname.endsWith("arxiv.org")) {
    const arxivId = parseArxivId(url);
    const canonicalUrl = arxivId
      ? `https://arxiv.org/abs/${arxivId}`
      : rawInput;
    const pdfUrl = arxivId ? `https://arxiv.org/pdf/${arxivId}` : undefined;

    return {
      rawInput,
      isUrl: true,
      sourceType: "arxiv",
      canonicalUrl,
      pdfUrl,
      arxivId,
    };
  }

  if (hostname.includes("doi.org") || doi) {
    return {
      rawInput,
      isUrl: true,
      sourceType: "doi",
      canonicalUrl: doi ? `https://doi.org/${doi}` : rawInput,
      doi,
    };
  }

  if (hostname.endsWith("openreview.net")) {
    const openreviewId = parseOpenReviewId(url);

    return {
      rawInput,
      isUrl: true,
      sourceType: "openreview",
      canonicalUrl: rawInput,
      openreviewId,
    };
  }

  if (hostname.endsWith("semanticscholar.org")) {
    return {
      rawInput,
      isUrl: true,
      sourceType: "semantic_scholar",
      canonicalUrl: rawInput,
      semanticScholarId: parseSemanticScholarId(url),
    };
  }

  if (pathname.endsWith(".pdf")) {
    return {
      rawInput,
      isUrl: true,
      sourceType: "pdf",
      canonicalUrl: rawInput,
      pdfUrl: rawInput,
    };
  }

  return {
    rawInput,
    isUrl: true,
    sourceType: "unknown",
    canonicalUrl: rawInput,
  };
}

export function canonicalKeyForParsedInput(
  parsedInput: ParsedPaperInput,
  title?: string,
  year?: number | null,
): string | null {
  return canonicalKeyForPaperFields({
    doi: parsedInput.doi,
    arxivId: parsedInput.arxivId,
    openreviewId: parsedInput.openreviewId,
    semanticScholarId: parsedInput.semanticScholarId,
    canonicalUrl: parsedInput.canonicalUrl,
    title,
    year,
  });
}

export function canonicalKeyForPaperFields(
  fields: CanonicalPaperKeyFields,
): string | null {
  if (fields.doi) {
    return `doi:${fields.doi.trim().toLowerCase()}`;
  }

  if (fields.arxivId) {
    return `arxiv:${fields.arxivId.trim().toLowerCase()}`;
  }

  if (fields.openreviewId) {
    return `openreview:${fields.openreviewId.trim()}`;
  }

  if (fields.semanticScholarId) {
    return `semantic_scholar:${fields.semanticScholarId.trim()}`;
  }

  if (fields.canonicalUrl) {
    return `url:${fields.canonicalUrl.trim().toLowerCase()}`;
  }

  if (fields.title && fields.year) {
    return `title_year:${fields.title.trim().toLowerCase()}:${fields.year}`;
  }

  return null;
}
