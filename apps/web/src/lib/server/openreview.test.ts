import { describe, expect, it } from "vitest";
import { metadataFromOpenReviewNote } from "./openreview";

describe("OpenReview metadata parsing", () => {
  it("extracts metadata from v2 note content values", () => {
    expect(
      metadataFromOpenReviewNote(
        {
          id: "note-id",
          forum: "forum-id",
          content: {
            title: { value: "OpenReview Paper" },
            authors: { value: ["Ada Lovelace", "Grace Hopper"] },
            venue: { value: "ICLR" },
            year: { value: "2025" },
            pdf: { value: "/pdf?id=forum-id" },
          },
        },
        "forum-id",
      ),
    ).toEqual({
      title: "OpenReview Paper",
      authors: ["Ada Lovelace", "Grace Hopper"],
      year: 2025,
      venue: "ICLR",
      canonicalUrl: "https://openreview.net/forum?id=forum-id",
      pdfUrl: "https://openreview.net/pdf?id=forum-id",
      openreviewId: "forum-id",
      sourceType: "openreview",
    });
  });

  it("returns null without title", () => {
    expect(
      metadataFromOpenReviewNote({ forum: "forum-id" }, "forum-id"),
    ).toBeNull();
  });
});
