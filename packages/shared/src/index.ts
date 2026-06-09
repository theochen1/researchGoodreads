import { z } from "zod";

export const readingStates = [
  "want_to_read",
  "reading",
  "read",
  "deep_read",
  "skipped",
] as const;

export const recommendationSignals = [
  "worth_reading",
  "worth_skimming",
  "useful_reference",
  "not_worth_prioritizing",
  "unsure",
] as const;

export const addedViaValues = ["web", "extension", "manual"] as const;

export const sourceTypes = [
  "arxiv",
  "doi",
  "openreview",
  "semantic_scholar",
  "pdf",
  "manual",
  "unknown",
] as const;

export const analyticsEventNames = [
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
] as const;

export type ReadingState = (typeof readingStates)[number];
export type RecommendationSignal = (typeof recommendationSignals)[number];
export type AddedVia = (typeof addedViaValues)[number];
export type SourceType = (typeof sourceTypes)[number];
export type AnalyticsEventName = (typeof analyticsEventNames)[number];

export const readingStateSchema = z.enum(readingStates);
export const recommendationSignalSchema = z.enum(recommendationSignals);
export const addedViaSchema = z.enum(addedViaValues);
export const sourceTypeSchema = z.enum(sourceTypes);
export const analyticsEventNameSchema = z.enum(analyticsEventNames);

export const visibleCommentMaxLength = 1000;
