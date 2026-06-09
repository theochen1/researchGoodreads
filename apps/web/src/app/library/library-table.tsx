"use client";

import {
  recommendationSignals,
  readingStates,
  type ReadingState,
  type RecommendationSignal,
  type SourceType,
} from "@cairn/shared";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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

const sortLabels: Record<SortMode, string> = {
  updated: "Recently updated",
  added: "Recently added",
};

type LibraryItem = {
  id: string;
  reading_state: ReadingState;
  recommendation_signal: RecommendationSignal | null;
  visible_comment: string | null;
  added_at: string;
  state_updated_at: string;
  latest_visible_at: string;
  hasPrivateNote: boolean;
  papers: {
    id: string;
    title: string;
    authors: string[] | null;
    year: number | null;
    venue: string | null;
    abstract: string | null;
    source_type: SourceType;
  } | null;
};

type SortMode = "updated" | "added";
type StateFilter = "all" | ReadingState;

const stateFilters: StateFilter[] = ["all", ...readingStates];

type LibraryPayload = {
  items: LibraryItem[];
  nextCursor: string | null;
};

type UpdatePatch = {
  readingState?: ReadingState;
  recommendationSignal?: RecommendationSignal | null;
};

function createLibraryQueryString(
  sortMode: SortMode,
  stateFilter: StateFilter,
) {
  const params = new URLSearchParams({ sort: sortMode });

  if (stateFilter !== "all") {
    params.set("state", stateFilter);
  }

  return params.toString();
}

async function fetchLibrary(queryString: string, cursor?: string | null) {
  const params = new URLSearchParams(queryString);

  if (cursor) {
    params.set("cursor", cursor);
  }

  const response = await fetch(`/api/library?${params.toString()}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Library load failed");
  }

  return payload.data as LibraryPayload;
}

async function deleteLibraryItem(userPaperId: string) {
  const response = await fetch("/api/library", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userPaperId }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Remove failed");
  }

  return payload.data as { removed: boolean };
}

async function patchUserPaper(userPaperId: string, patch: UpdatePatch) {
  const response = await fetch(`/api/user-papers/${userPaperId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Update failed");
  }

  return payload.data as { updated: boolean; userPaperId: string };
}

export function LibraryTable() {
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [mutationStatus, setMutationStatus] = useState<string | null>(null);

  const queryString = useMemo(
    () => createLibraryQueryString(sortMode, stateFilter),
    [sortMode, stateFilter],
  );

  const libraryKey = useMemo(
    () => ["library", sortMode, stateFilter] as const,
    [sortMode, stateFilter],
  );

  const libraryQuery = useInfiniteQuery({
    queryKey: libraryKey,
    queryFn: ({ pageParam }) => fetchLibrary(queryString, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
  });
  const {
    data: libraryData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = libraryQuery;

  const items = useMemo(
    () => libraryData?.pages.flatMap((page) => page.items) ?? [],
    [libraryData],
  );
  const activeFilterLabel =
    stateFilter === "all" ? "All papers" : stateLabels[stateFilter];
  const resultsTransitionKey = `${sortMode}:${stateFilter}`;

  useEffect(() => {
    for (const filter of stateFilters) {
      void queryClient.prefetchInfiniteQuery({
        queryKey: ["library", sortMode, filter],
        queryFn: ({ pageParam }) =>
          fetchLibrary(createLibraryQueryString(sortMode, filter), pageParam),
        getNextPageParam: (lastPage: LibraryPayload) =>
          lastPage.nextCursor ?? undefined,
        initialPageParam: null as string | null,
      });
    }
  }, [queryClient, sortMode]);

  useEffect(() => {
    const node = loadMoreRef.current;

    if (!node || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const removeMutation = useMutation({
    mutationFn: deleteLibraryItem,
    onMutate: async (userPaperId) => {
      setMutationStatus(null);
      await queryClient.cancelQueries({ queryKey: libraryKey });
      const previous =
        queryClient.getQueryData<InfiniteData<LibraryPayload>>(libraryKey);

      queryClient.setQueryData<InfiniteData<LibraryPayload>>(
        libraryKey,
        (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  items: page.items.filter((row) => row.id !== userPaperId),
                })),
              }
            : current,
      );

      return { previous };
    },
    onError: (error, _userPaperId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(libraryKey, context.previous);
      }
      setMutationStatus(
        error instanceof Error ? error.message : "Remove failed",
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["library"] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["paper"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ item, patch }: { item: LibraryItem; patch: UpdatePatch }) =>
      patchUserPaper(item.id, patch),
    onMutate: async ({ item, patch }) => {
      const now = new Date().toISOString();
      setMutationStatus(null);
      await queryClient.cancelQueries({ queryKey: libraryKey });
      const previous =
        queryClient.getQueryData<InfiniteData<LibraryPayload>>(libraryKey);

      queryClient.setQueryData<InfiniteData<LibraryPayload>>(
        libraryKey,
        (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  items: page.items.map((row) =>
                    row.id === item.id
                      ? {
                          ...row,
                          reading_state:
                            patch.readingState ?? row.reading_state,
                          recommendation_signal:
                            Object.prototype.hasOwnProperty.call(
                              patch,
                              "recommendationSignal",
                            )
                              ? (patch.recommendationSignal ?? null)
                              : row.recommendation_signal,
                          state_updated_at: patch.readingState
                            ? now
                            : row.state_updated_at,
                          latest_visible_at: now,
                        }
                      : row,
                  ),
                })),
              }
            : current,
      );

      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(libraryKey, context.previous);
      }
      setMutationStatus(
        error instanceof Error ? error.message : "Update failed",
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["library"] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["paper"] });
    },
  });

  async function removeItem(item: LibraryItem) {
    const needsConfirmation =
      item.hasPrivateNote || Boolean(item.visible_comment?.trim());

    if (
      needsConfirmation &&
      !window.confirm(
        "Remove this paper, archive your private note, and hide your visible comment?",
      )
    ) {
      return;
    }

    removeMutation.mutate(item.id);
  }

  function updateItem(item: LibraryItem, patch: UpdatePatch) {
    updateMutation.mutate({ item, patch });
  }

  return (
    <>
      <div className="toolbar">
        <button
          aria-pressed={stateFilter === "all"}
          className={`button filter-button${
            stateFilter === "all" ? " is-active" : ""
          }`}
          onClick={() => setStateFilter("all")}
          type="button"
        >
          All
        </button>
        {readingStates.map((state) => (
          <button
            aria-pressed={stateFilter === state}
            className={`button filter-button${
              stateFilter === state ? " is-active" : ""
            }`}
            key={state}
            onClick={() => setStateFilter(state)}
            type="button"
          >
            {stateLabels[state]}
          </button>
        ))}
        <select
          className="control"
          onChange={(event) => setSortMode(event.target.value as SortMode)}
          value={sortMode}
        >
          <option value="updated">{sortLabels.updated}</option>
          <option value="added">{sortLabels.added}</option>
        </select>
      </div>
      <div className="filter-status" aria-live="polite">
        <span className="badge">{activeFilterLabel}</span>
        <span>{sortLabels[sortMode]}</span>
        <span>{items.length} loaded</span>
        {libraryQuery.isFetching && !libraryQuery.isLoading ? (
          <span>Refreshing</span>
        ) : null}
      </div>
      {libraryQuery.error ? (
        <div className="status-line">
          {libraryQuery.error instanceof Error
            ? libraryQuery.error.message
            : "Library load failed"}
        </div>
      ) : null}
      {mutationStatus ? (
        <div className="status-line">{mutationStatus}</div>
      ) : null}
      <section className="surface table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>Paper</th>
              <th>State</th>
              <th>Signal</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody className="filter-results" key={resultsTransitionKey}>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="paper-cell-title">
                    {item.papers?.id ? (
                      <Link href={`/papers/${item.papers.id}`}>
                        {item.papers.title}
                      </Link>
                    ) : (
                      "Untitled paper"
                    )}
                  </div>
                  <div className="paper-cell-meta">
                    {[
                      item.papers?.authors?.join(", "),
                      item.papers?.year,
                      item.papers?.venue,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {item.papers?.abstract ? (
                    <p className="paper-abstract-preview">
                      {item.papers.abstract}
                    </p>
                  ) : null}
                </td>
                <td>
                  <select
                    className="control"
                    onChange={(event) =>
                      void updateItem(item, {
                        readingState: event.target.value as ReadingState,
                      })
                    }
                    value={item.reading_state}
                  >
                    {readingStates.map((state) => (
                      <option key={state} value={state}>
                        {stateLabels[state]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="control"
                    onChange={(event) =>
                      void updateItem(item, {
                        recommendationSignal:
                          event.target.value === ""
                            ? null
                            : (event.target.value as RecommendationSignal),
                      })
                    }
                    value={item.recommendation_signal ?? ""}
                  >
                    <option value="">None</option>
                    {recommendationSignals.map((signal) => (
                      <option key={signal} value={signal}>
                        {signalLabels[signal]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{new Date(item.latest_visible_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className="button"
                    onClick={() => void removeItem(item)}
                    type="button"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {!libraryQuery.isLoading && items.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <h2>No papers</h2>
                    <p>
                      <Link href="/add">Add a paper</Link>
                    </p>
                  </div>
                </td>
              </tr>
            ) : null}
            {libraryQuery.isLoading ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <h2>Loading</h2>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {hasNextPage ? (
          <div className="form-grid" ref={loadMoreRef}>
            <button
              className="button"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
              type="button"
            >
              {isFetchingNextPage ? "Loading" : "Load More"}
            </button>
          </div>
        ) : null}
      </section>
    </>
  );
}
