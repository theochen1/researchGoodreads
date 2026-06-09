"use client";

import { readingStates, type ReadingState } from "@cairn/shared";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";

type LibrarySortMode = "updated" | "added";
type LibraryStateFilter = "all" | ReadingState;

type FeedPreloadPage = {
  items: {
    paper: {
      id: string;
    } | null;
  }[];
  nextCursor: string | null;
};

type LibraryPreloadPage = {
  items: {
    papers: {
      id: string;
    } | null;
  }[];
  nextCursor: string | null;
};

const primaryLibraryFilters: LibraryStateFilter[] = ["all", ...readingStates];

function createLibraryQueryPath(
  sortMode: LibrarySortMode,
  stateFilter: LibraryStateFilter,
) {
  const params = new URLSearchParams({ sort: sortMode });

  if (stateFilter !== "all") {
    params.set("state", stateFilter);
  }

  return `/api/library?${params.toString()}`;
}

async function fetchJsonData<TData>(path: string): Promise<TData> {
  const response = await fetch(path);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Request failed");
  }

  return payload.data as TData;
}

function AppDataPreloader({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    async function prefetchFirstInfinitePage<TData>(
      queryKey: readonly unknown[],
      path: string,
    ) {
      const data = await fetchJsonData<TData>(path);
      queryClient.setQueryData<InfiniteData<TData>>(queryKey, {
        pages: [data],
        pageParams: [null],
      });

      return data;
    }

    const libraryPrefetches = primaryLibraryFilters.map((stateFilter) =>
      prefetchFirstInfinitePage<LibraryPreloadPage>(
        ["library", "updated", stateFilter],
        createLibraryQueryPath("updated", stateFilter),
      ),
    );
    const addedLibraryPrefetch = prefetchFirstInfinitePage<LibraryPreloadPage>(
      ["library", "added", "all"],
      createLibraryQueryPath("added", "all"),
    );
    const feedPrefetch = prefetchFirstInfinitePage<FeedPreloadPage>(
      ["feed"],
      "/api/feed?",
    );
    const peoplePrefetch = queryClient.prefetchQuery({
      queryKey: ["people", ""],
      queryFn: () => fetchJsonData("/api/follows?"),
    });
    const profilePrefetch = queryClient.prefetchQuery({
      queryKey: ["profile"],
      queryFn: () => fetchJsonData("/api/profile"),
    });

    void (async () => {
      const [libraryResults, addedLibraryResult, feedResult] =
        await Promise.all([
          Promise.allSettled(libraryPrefetches),
          addedLibraryPrefetch
            .then((value) => ({ status: "fulfilled" as const, value }))
            .catch((reason: unknown) => ({
              status: "rejected" as const,
              reason,
            })),
          feedPrefetch
            .then((value) => ({ status: "fulfilled" as const, value }))
            .catch((reason: unknown) => ({
              status: "rejected" as const,
              reason,
            })),
        ]);

      const paperIds = new Set<string>();

      for (const result of libraryResults) {
        if (result.status === "fulfilled") {
          for (const item of result.value.items) {
            if (item.papers?.id) {
              paperIds.add(item.papers.id);
            }
          }
        }
      }

      if (addedLibraryResult.status === "fulfilled") {
        for (const item of addedLibraryResult.value.items) {
          if (item.papers?.id) {
            paperIds.add(item.papers.id);
          }
        }
      }

      if (feedResult.status === "fulfilled") {
        for (const item of feedResult.value.items) {
          if (item.paper?.id) {
            paperIds.add(item.paper.id);
          }
        }
      }

      await Promise.allSettled([
        peoplePrefetch,
        profilePrefetch,
        ...[...paperIds].slice(0, 8).map((paperId) =>
          queryClient.prefetchQuery({
            queryKey: ["paper", paperId],
            queryFn: () => fetchJsonData(`/api/papers/${paperId}`),
          }),
        ),
      ]);
    })();
  }, [enabled, queryClient]);

  return null;
}

export function Providers({
  children,
  shouldPrefetchAppData,
}: {
  children: React.ReactNode;
  shouldPrefetchAppData: boolean;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 120_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppDataPreloader enabled={shouldPrefetchAppData} />
      {children}
    </QueryClientProvider>
  );
}
