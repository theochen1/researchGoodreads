import { afterEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "./analytics";
import { parsePaperInput } from "./capture";
import {
  captureUpdateForExistingUserPaper,
  draftFromExistingPaper,
  draftFromParsedAndMetadata,
  resolveMetadataBestEffort,
  type ExistingPaper,
} from "./capture-service";

vi.mock("./analytics", () => ({
  trackEvent: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("capture service", () => {
  it("turns unknown URLs into manual fallback drafts", () => {
    expect(
      draftFromParsedAndMetadata(
        parsePaperInput("https://example.edu/research/post"),
        null,
      ),
    ).toMatchObject({
      title: "",
      sourceType: "manual",
      canonicalUrl: "https://example.edu/research/post",
      pdfUrl: null,
    });
  });

  it("preserves direct PDF URLs for fallback capture", () => {
    expect(
      draftFromParsedAndMetadata(
        parsePaperInput("https://example.edu/papers/result.pdf"),
        null,
      ),
    ).toMatchObject({
      sourceType: "pdf",
      canonicalUrl: "https://example.edu/papers/result.pdf",
      pdfUrl: "https://example.edu/papers/result.pdf",
    });
  });

  it("builds DOI drafts from Crossref metadata and parsed DOI input", () => {
    expect(
      draftFromParsedAndMetadata(
        parsePaperInput("https://doi.org/10.1145/1234567"),
        {
          title: "Resolved DOI Paper",
          authors: ["Ada Lovelace"],
          year: 2024,
          venue: "Conference",
          canonicalUrl: "https://doi.org/10.1145/1234567",
          doi: "10.1145/1234567",
          sourceType: "doi",
        },
      ),
    ).toEqual({
      title: "Resolved DOI Paper",
      sourceType: "doi",
      authors: ["Ada Lovelace"],
      year: 2024,
      abstract: null,
      venue: "Conference",
      canonicalUrl: "https://doi.org/10.1145/1234567",
      pdfUrl: null,
      doi: "10.1145/1234567",
      arxivId: null,
      openreviewId: null,
      semanticScholarId: null,
    });
  });

  it("builds OpenReview drafts with canonical and PDF links", () => {
    expect(
      draftFromParsedAndMetadata(
        parsePaperInput("https://openreview.net/forum?id=forum-id"),
        {
          title: "Resolved OpenReview Paper",
          authors: ["Grace Hopper"],
          year: 2025,
          venue: "ICLR",
          canonicalUrl: "https://openreview.net/forum?id=forum-id",
          pdfUrl: "https://openreview.net/pdf?id=forum-id",
          openreviewId: "forum-id",
          sourceType: "openreview",
        },
      ),
    ).toEqual({
      title: "Resolved OpenReview Paper",
      sourceType: "openreview",
      authors: ["Grace Hopper"],
      year: 2025,
      abstract: null,
      venue: "ICLR",
      canonicalUrl: "https://openreview.net/forum?id=forum-id",
      pdfUrl: "https://openreview.net/pdf?id=forum-id",
      doi: null,
      arxivId: null,
      openreviewId: "forum-id",
      semanticScholarId: null,
    });
  });

  it("builds editable drafts from existing paper records", () => {
    const paper: ExistingPaper = {
      id: "paper-id",
      title: "Existing Paper",
      source_type: "arxiv",
      authors: ["A. Researcher", "B. Scientist"],
      year: 2025,
      abstract: "Stored abstract",
      venue: "Conference",
      canonical_url: "https://arxiv.org/abs/2501.12345",
      pdf_url: "https://arxiv.org/pdf/2501.12345",
      doi: null,
      arxiv_id: "2501.12345",
      openreview_id: null,
      semantic_scholar_id: null,
    };

    expect(draftFromExistingPaper(paper)).toEqual({
      title: "Existing Paper",
      sourceType: "arxiv",
      authors: ["A. Researcher", "B. Scientist"],
      year: 2025,
      abstract: "Stored abstract",
      venue: "Conference",
      canonicalUrl: "https://arxiv.org/abs/2501.12345",
      pdfUrl: "https://arxiv.org/pdf/2501.12345",
      doi: null,
      arxivId: "2501.12345",
      openreviewId: null,
      semanticScholarId: null,
    });
  });

  it("preserves added_via when extension capture updates an active saved paper", () => {
    expect(
      captureUpdateForExistingUserPaper({
        existingUserPaper: {
          reading_state: "want_to_read",
          removed_at: null,
        },
        readingState: "read",
        addedVia: "extension",
        capturedUrl: "https://arxiv.org/abs/2501.12345",
        now: "2026-06-07T00:00:00.000Z",
      }),
    ).toEqual({
      patch: {
        reading_state: "read",
        state_updated_at: "2026-06-07T00:00:00.000Z",
        captured_url: "https://arxiv.org/abs/2501.12345",
      },
      shouldEmitPaperAdded: false,
      shouldEmitReadingStateUpdated: true,
    });
  });

  it("sets added_via when capture restores a removed paper", () => {
    expect(
      captureUpdateForExistingUserPaper({
        existingUserPaper: {
          reading_state: "skipped",
          removed_at: "2026-06-01T00:00:00.000Z",
        },
        readingState: "reading",
        addedVia: "extension",
        capturedUrl: "https://arxiv.org/abs/2501.12345",
        now: "2026-06-07T00:00:00.000Z",
      }),
    ).toEqual({
      patch: {
        reading_state: "reading",
        state_updated_at: "2026-06-07T00:00:00.000Z",
        captured_url: "https://arxiv.org/abs/2501.12345",
        added_via: "extension",
        removed_at: null,
      },
      shouldEmitPaperAdded: true,
      shouldEmitReadingStateUpdated: false,
    });
  });

  it("does not clear captured_url when a save flow has no new capture URL", () => {
    expect(
      captureUpdateForExistingUserPaper({
        existingUserPaper: {
          reading_state: "want_to_read",
          removed_at: null,
        },
        readingState: "reading",
        addedVia: "web",
        now: "2026-06-07T00:00:00.000Z",
      }).patch,
    ).toEqual({
      reading_state: "reading",
      state_updated_at: "2026-06-07T00:00:00.000Z",
    });
  });

  it("tracks metadata failures for unsupported URL fallback paths", async () => {
    await expect(
      resolveMetadataBestEffort(
        parsePaperInput("https://example.edu/research/post"),
        "user-id",
      ),
    ).resolves.toBeNull();

    expect(trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-id",
        eventName: "metadata_resolution_failed",
        entityType: "paper_input",
        metadata: expect.objectContaining({
          sourceType: "unknown",
        }),
      }),
    );
  });
});
