import { describe, expect, it } from "vitest";
import { metadataFromCrossrefWork } from "./crossref";

describe("Crossref metadata parsing", () => {
  it("extracts normalized DOI metadata", () => {
    expect(
      metadataFromCrossrefWork({
        DOI: "10.1145/1234567",
        title: ["A   DOI Paper"],
        author: [
          { given: "Ada", family: "Lovelace" },
          { name: "Grace Hopper" },
        ],
        published: { "date-parts": [[2024, 5, 1]] },
        "container-title": ["Conference"],
      }),
    ).toEqual({
      title: "A DOI Paper",
      authors: ["Ada Lovelace", "Grace Hopper"],
      year: 2024,
      venue: "Conference",
      canonicalUrl: "https://doi.org/10.1145/1234567",
      doi: "10.1145/1234567",
      sourceType: "doi",
    });
  });

  it("returns null without DOI or title", () => {
    expect(metadataFromCrossrefWork({ title: ["Missing DOI"] })).toBeNull();
    expect(metadataFromCrossrefWork({ DOI: "10.1145/1234567" })).toBeNull();
  });
});
