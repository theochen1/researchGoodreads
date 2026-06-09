"use client";

import type {
  ReadingState,
  RecommendationSignal,
  SourceType,
} from "@cairn/shared";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";

const stateLabels: Record<ReadingState, string> = {
  want_to_read: "Want to read",
  reading: "Reading",
  read: "Read",
  deep_read: "Deep read",
  skipped: "Skipped",
};

const signalLabels: Record<RecommendationSignal, string> = {
  worth_reading: "Worth reading",
  worth_skimming: "Worth skimming",
  useful_reference: "Useful reference",
  not_worth_prioritizing: "Not worth prioritizing",
  unsure: "Unsure",
};

type FeedItem = {
  id: string;
  latestVisibleAt: string;
  readingState: ReadingState;
  recommendationSignal: RecommendationSignal | null;
  visibleComment: string | null;
  paper: {
    id: string;
    title: string;
    authors: string[] | null;
    year: number | null;
    venue: string | null;
    abstract: string | null;
    source_type: SourceType;
  } | null;
  profile: {
    name: string;
    username: string;
    affiliation: string | null;
    role: string | null;
  } | null;
};

type FeedPage = {
  items: FeedItem[];
  nextCursor: string | null;
};

async function fetchFeedPage(cursor?: string | null) {
  const params = new URLSearchParams();

  if (cursor) {
    params.set("cursor", cursor);
  }

  const response = await fetch(`/api/feed?${params.toString()}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Feed load failed");
  }

  return payload.data as FeedPage;
}

export function FeedList() {
  const feedQuery = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
  });
  const items = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [feedQuery.data],
  );

  return (
    <section className="surface">
      {feedQuery.error ? (
        <div className="status-line">
          {feedQuery.error instanceof Error
            ? feedQuery.error.message
            : "Feed load failed"}
        </div>
      ) : null}
      <div className="feed-list">
        {items.map((item) => (
          <Link
            className="feed-item"
            href={item.paper?.id ? `/papers/${item.paper.id}` : "/library"}
            key={item.id}
          >
            <div className="feed-item-header">
              <strong>{item.profile?.name ?? "Beta user"}</strong>
              <span className="muted-text">
                {new Date(item.latestVisibleAt).toLocaleString()}
              </span>
            </div>
            <div className="paper-cell-title">
              {item.paper?.title ?? "Untitled paper"}
            </div>
            <div className="paper-cell-meta">
              {[
                item.paper?.authors?.join(", "),
                item.paper?.year,
                item.paper?.venue,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
            {item.paper?.abstract ? (
              <p className="paper-abstract-preview">{item.paper.abstract}</p>
            ) : null}
            <div className="toolbar compact-toolbar">
              <span className="badge">{stateLabels[item.readingState]}</span>
              {item.recommendationSignal ? (
                <span className="badge">
                  {signalLabels[item.recommendationSignal]}
                </span>
              ) : null}
            </div>
            {item.visibleComment ? (
              <p className="feed-comment">{item.visibleComment}</p>
            ) : null}
          </Link>
        ))}
        {!feedQuery.isLoading && items.length === 0 ? (
          <div className="empty-state">
            <h2>No followed activity yet</h2>
            <p>
              Follow trusted researchers to see their latest reading states,
              recommendation signals, and visible paper comments.
            </p>
          </div>
        ) : null}
        {feedQuery.isLoading ? (
          <div className="empty-state">
            <h2>Loading</h2>
          </div>
        ) : null}
      </div>
      {feedQuery.hasNextPage ? (
        <div className="form-grid">
          <button
            className="button"
            disabled={feedQuery.isFetchingNextPage}
            onClick={() => void feedQuery.fetchNextPage()}
            type="button"
          >
            {feedQuery.isFetchingNextPage ? "Loading" : "Load More"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
