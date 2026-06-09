import { describe, expect, it } from "vitest";
import { metadataFromArxivAtom } from "./arxiv";

const sampleAtom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2401.12345v2</id>
    <updated>2024-01-20T00:00:00Z</updated>
    <published>2024-01-19T00:00:00Z</published>
    <title>
      A   Useful   Paper
    </title>
    <summary>
      This paper has a multiline
      abstract.
    </summary>
    <author>
      <name>Ada Lovelace</name>
    </author>
    <author>
      <name>Grace Hopper</name>
    </author>
  </entry>
</feed>`;

describe("arXiv metadata parsing", () => {
  it("extracts normalized paper metadata from Atom XML", () => {
    expect(metadataFromArxivAtom(sampleAtom, "2401.12345v2")).toEqual({
      title: "A Useful Paper",
      authors: ["Ada Lovelace", "Grace Hopper"],
      year: 2024,
      abstract: "This paper has a multiline abstract.",
      canonicalUrl: "https://arxiv.org/abs/2401.12345",
      pdfUrl: "https://arxiv.org/pdf/2401.12345",
      arxivId: "2401.12345",
      sourceType: "arxiv",
    });
  });

  it("returns null when the feed has no entry title", () => {
    expect(metadataFromArxivAtom("<feed />", "2401.12345")).toBeNull();
  });
});
