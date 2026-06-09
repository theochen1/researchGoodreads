"use client";

import type {
  ReadingState,
  RecommendationSignal,
  SourceType,
} from "@cairn/shared";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";

type FeedItem = {
  id: string;
  latestVisibleAt: string;
  activitySummary: string;
  readingState: ReadingState;
  recommendationSignal: RecommendationSignal | null;
  visibleComment: string | null;
  paper: {
    id: string;
    title: string;
    authors: string[] | null;
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
            </div>
            <div className="paper-cell-title">
              {item.paper?.title ?? "Untitled paper"}
            </div>
            <div className="paper-cell-meta">
              {item.paper?.authors?.join(", ") ?? ""}
            </div>
            <p className="feed-activity">{item.activitySummary}</p>
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
