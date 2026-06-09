import { describe, expect, it } from "vitest";
import {
  addedViaValues,
  analyticsEventNames,
  recommendationSignals,
  readingStates,
  visibleCommentMaxLength,
} from "./index.js";

describe("v0 shared constants", () => {
  it("defines the required reading states", () => {
    expect(readingStates).toEqual([
      "want_to_read",
      "reading",
      "read",
      "deep_read",
      "skipped",
    ]);
  });

  it("defines the required recommendation signals", () => {
    expect(recommendationSignals).toEqual([
      "worth_reading",
      "worth_skimming",
      "useful_reference",
      "not_worth_prioritizing",
      "unsure",
    ]);
  });

  it("defines core v0 constraints and events", () => {
    expect(addedViaValues).toEqual(["web", "extension", "manual"]);
    expect(visibleCommentMaxLength).toBe(1000);
    expect(analyticsEventNames).toEqual([
      "paper_added",
      "paper_removed",
      "paper_added_from_extension",
      "paper_added_from_web",
      "reading_state_updated",
      "recommendation_signal_set",
      "visible_comment_created",
      "private_note_created",
      "follow_created",
      "following_feed_viewed",
      "extension_connected",
      "metadata_resolution_failed",
    ]);
  });
});
