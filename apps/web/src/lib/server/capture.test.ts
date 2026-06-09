import { describe, expect, it } from "vitest";
import {
  canonicalKeyForPaperFields,
  canonicalKeyForParsedInput,
  parsePaperInput,
} from "./capture";

describe("capture parsing", () => {
  it("parses arXiv abstract and PDF URLs", () => {
    expect(parsePaperInput("https://arxiv.org/abs/2401.12345")).toMatchObject({
      sourceType: "arxiv",
      arxivId: "2401.12345",
      canonicalUrl: "https://arxiv.org/abs/2401.12345",
      pdfUrl: "https://arxiv.org/pdf/2401.12345",
    });
    expect(parsePaperInput("https://arxiv.org/pdf/2401.12345v2")).toMatchObject(
      {
        sourceType: "arxiv",
        arxivId: "2401.12345",
      },
    );
  });

  it("parses DOI, OpenReview, Semantic Scholar, PDF, and manual inputs", () => {
    expect(parsePaperInput("https://doi.org/10.1145/1234567")).toMatchObject({
      sourceType: "doi",
      doi: "10.1145/1234567",
    });
    expect(
      parsePaperInput("https://openreview.net/forum?id=abc123"),
    ).toMatchObject({
      sourceType: "openreview",
      openreviewId: "abc123",
    });
    expect(
      parsePaperInput("https://www.semanticscholar.org/paper/title/abcdef"),
    ).toMatchObject({
      sourceType: "semantic_scholar",
      semanticScholarId: "abcdef",
    });
    expect(parsePaperInput("https://example.com/paper.pdf")).toMatchObject({
      sourceType: "pdf",
      pdfUrl: "https://example.com/paper.pdf",
    });
    expect(parsePaperInput("A title only")).toMatchObject({
      sourceType: "manual",
      title: "A title only",
    });
  });

  it("builds canonical keys from deterministic identifiers first", () => {
    expect(
      canonicalKeyForParsedInput(
        parsePaperInput("https://arxiv.org/abs/2401.12345"),
      ),
    ).toBe("arxiv:2401.12345");
    expect(
      canonicalKeyForParsedInput(
        parsePaperInput("https://doi.org/10.1145/ABCDEF"),
      ),
    ).toBe("doi:10.1145/abcdef");
    expect(
      canonicalKeyForParsedInput(
        parsePaperInput("https://openreview.net/forum?id=abc123"),
      ),
    ).toBe("openreview:abc123");
    expect(
      canonicalKeyForParsedInput(
        parsePaperInput("A title only"),
        "A title only",
        2024,
      ),
    ).toBe("title_year:a title only:2024");
  });

  it("builds canonical keys from edited paper fields by priority", () => {
    expect(
      canonicalKeyForPaperFields({
        doi: "10.1145/ABCDEF",
        title: "Fallback Title",
        year: 2026,
      }),
    ).toBe("doi:10.1145/abcdef");
    expect(
      canonicalKeyForPaperFields({
        canonicalUrl: "HTTPS://EXAMPLE.EDU/PAPER",
      }),
    ).toBe("url:https://example.edu/paper");
  });
});
