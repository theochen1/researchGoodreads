import { XMLParser } from "fast-xml-parser";
import type { ParsedPaperInput } from "./capture";

export type ResolvedPaperMetadata = {
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  canonicalUrl: string;
  pdfUrl: string;
  arxivId: string;
  sourceType: "arxiv";
};

type ArxivAuthor = {
  name?: string;
};

type ArxivEntry = {
  id?: string;
  title?: string;
  summary?: string;
  published?: string;
  author?: ArxivAuthor | ArxivAuthor[];
};

type ArxivFeed = {
  feed?: {
    entry?: ArxivEntry | ArxivEntry[];
  };
};

const arxivParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
});

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeArxivId(arxivId: string): string {
  return arxivId.replace(/^arxiv:/i, "").replace(/v\d+$/i, "");
}

function authorsFromEntry(entry: ArxivEntry): string[] {
  if (!entry.author) {
    return [];
  }

  const authors = Array.isArray(entry.author) ? entry.author : [entry.author];

  return authors
    .map((author) => author.name)
    .filter((name): name is string => Boolean(name))
    .map(normalizeWhitespace);
}

function entryFromFeed(feed: ArxivFeed): ArxivEntry | null {
  const entry = feed.feed?.entry;

  if (!entry) {
    return null;
  }

  return Array.isArray(entry) ? (entry[0] ?? null) : entry;
}

export function metadataFromArxivAtom(
  atomXml: string,
  requestedArxivId: string,
): ResolvedPaperMetadata | null {
  const feed = arxivParser.parse(atomXml) as ArxivFeed;
  const entry = entryFromFeed(feed);

  if (!entry?.title) {
    return null;
  }

  const arxivId = normalizeArxivId(requestedArxivId);
  const publishedYear = entry.published
    ? new Date(entry.published).getUTCFullYear()
    : null;

  return {
    title: normalizeWhitespace(entry.title),
    authors: authorsFromEntry(entry),
    year: Number.isFinite(publishedYear) ? publishedYear : null,
    abstract: entry.summary ? normalizeWhitespace(entry.summary) : null,
    canonicalUrl: `https://arxiv.org/abs/${arxivId}`,
    pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
    arxivId,
    sourceType: "arxiv",
  };
}

export async function resolveArxivMetadata(
  parsedInput: ParsedPaperInput,
  timeoutMs = 5000,
): Promise<ResolvedPaperMetadata | null> {
  if (!parsedInput.arxivId) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const arxivId = normalizeArxivId(parsedInput.arxivId);
    const response = await fetch(
      `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      return null;
    }

    const atomXml = await response.text();

    return metadataFromArxivAtom(atomXml, arxivId);
  } finally {
    clearTimeout(timeout);
  }
}
