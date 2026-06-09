"use client";

import {
  recommendationSignals,
  readingStates,
  type ReadingState,
  type RecommendationSignal,
} from "@cairn/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

type PaperPageData = {
  paper: {
    id: string;
    title: string;
    authors: string[] | null;
    year: number | null;
    abstract: string | null;
    venue: string | null;
    canonical_url: string | null;
    pdf_url: string | null;
    doi: string | null;
    arxiv_id: string | null;
    openreview_id: string | null;
  };
  userPaper: {
    id: string;
    reading_state: ReadingState;
    recommendation_signal: RecommendationSignal | null;
    visible_comment: string | null;
  } | null;
  privateNote: {
    id: string;
    body: string;
  } | null;
  followedContext: {
    id: string;
    reading_state: ReadingState;
    recommendation_signal: RecommendationSignal | null;
    visible_comment: string | null;
    profile: {
      name: string;
      username: string;
      affiliation: string | null;
      role: string | null;
    } | null;
  }[];
};

type PaperPageResponse = PaperPageData | { redirectPaperId: string };

type PaperPageProps = {
  paperId: string;
};

async function fetchPaperPage(paperId: string) {
  const response = await fetch(`/api/papers/${paperId}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Paper load failed");
  }

  return payload.data as PaperPageResponse;
}

async function postPaperSave(paperId: string) {
  const response = await fetch(`/api/papers/${paperId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ readingState: "want_to_read" }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Save failed");
  }

  return payload.data as { userPaperId: string; saved: true };
}

async function deleteLibraryPaper(userPaperId: string) {
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

async function patchUserPaperApi(
  userPaperId: string,
  patch: Record<string, unknown>,
) {
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

async function postNote(userPaperId: string, body: string) {
  const response = await fetch("/api/notes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userPaperId, body }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Note save failed");
  }

  return payload.data as { noteId: string; saved: true };
}

async function deleteNoteApi(userPaperId: string) {
  const response = await fetch("/api/notes", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userPaperId }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Note delete failed");
  }

  return payload.data as { deleted: true };
}

async function postVisibleComment(
  userPaperId: string,
  visibleComment: string | null,
) {
  const response = await fetch("/api/comments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userPaperId, visibleComment }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Visible comment save failed");
  }

  return payload.data as { saved: true; userPaperId: string };
}

export function PaperPage({ paperId }: PaperPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [visibleComment, setVisibleComment] = useState("");
  const paperKey = useMemo(() => ["paper", paperId] as const, [paperId]);

  function patchUserPaper(
    patch: Partial<NonNullable<PaperPageData["userPaper"]>>,
  ) {
    queryClient.setQueryData<PaperPageResponse>(paperKey, (current) =>
      current && "paper" in current && current.userPaper
        ? {
            ...current,
            userPaper: { ...current.userPaper, ...patch },
          }
        : current,
    );
  }

  const paperQuery = useQuery({
    queryKey: paperKey,
    queryFn: () => fetchPaperPage(paperId),
  });

  useEffect(() => {
    if (paperQuery.data && "redirectPaperId" in paperQuery.data) {
      router.replace(`/papers/${paperQuery.data.redirectPaperId}`);
    }
  }, [paperQuery.data, router]);

  const data =
    paperQuery.data && "paper" in paperQuery.data ? paperQuery.data : null;

  useEffect(() => {
    setNoteBody(data?.privateNote?.body ?? "");
    setVisibleComment(data?.userPaper?.visible_comment ?? "");
  }, [data?.privateNote?.body, data?.userPaper?.visible_comment]);

  const userPaperId = data?.userPaper?.id;
  const metadataLine = useMemo(() => {
    if (!data) {
      return "";
    }

    return [data.paper.authors?.join(", "), data.paper.year, data.paper.venue]
      .filter(Boolean)
      .join(" · ");
  }, [data]);

  const savePaperMutation = useMutation({
    mutationFn: () => postPaperSave(paperId),
    onMutate: () => {
      setStatus(null);
    },
    onSuccess: (result) => {
      queryClient.setQueryData<PaperPageResponse>(paperKey, (current) =>
        current && "paper" in current
          ? {
              ...current,
              userPaper: {
                id: result.userPaperId,
                reading_state: "want_to_read",
                recommendation_signal: null,
                visible_comment: null,
              },
              privateNote: null,
            }
          : current,
      );
      setNoteBody("");
      setVisibleComment("");
      setStatus("Saved to your library.");
    },
    onError: (error) => {
      setStatus(error instanceof Error ? error.message : "Save failed");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["library"] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const removePaperMutation = useMutation({
    mutationFn: deleteLibraryPaper,
    onMutate: async () => {
      setStatus(null);
      await queryClient.cancelQueries({ queryKey: paperKey });
      const previous = queryClient.getQueryData<PaperPageResponse>(paperKey);

      queryClient.setQueryData<PaperPageResponse>(paperKey, (current) =>
        current && "paper" in current
          ? { ...current, userPaper: null, privateNote: null }
          : current,
      );
      setNoteBody("");
      setVisibleComment("");

      return { previous };
    },
    onError: (error, _userPaperId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(paperKey, context.previous);
      }
      setStatus(error instanceof Error ? error.message : "Remove failed");
    },
    onSuccess: () => {
      setStatus("Removed from your library.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["library"] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: paperKey });
    },
  });

  const updateUserPaperMutation = useMutation({
    mutationFn: ({
      nextUserPaperId,
      patch,
    }: {
      nextUserPaperId: string;
      patch: Record<string, unknown>;
    }) => patchUserPaperApi(nextUserPaperId, patch),
    onMutate: async ({ patch }) => {
      const previous = queryClient.getQueryData<PaperPageResponse>(paperKey);
      const optimisticPatch: Partial<NonNullable<PaperPageData["userPaper"]>> =
        {};

      setStatus(null);
      await queryClient.cancelQueries({ queryKey: paperKey });

      if (typeof patch.readingState === "string") {
        optimisticPatch.reading_state = patch.readingState as ReadingState;
      }

      if (Object.prototype.hasOwnProperty.call(patch, "recommendationSignal")) {
        optimisticPatch.recommendation_signal = (patch.recommendationSignal ??
          null) as RecommendationSignal | null;
      }

      if (Object.keys(optimisticPatch).length > 0) {
        patchUserPaper(optimisticPatch);
      }

      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(paperKey, context.previous);
      }
      setStatus(error instanceof Error ? error.message : "Update failed");
    },
    onSuccess: () => {
      setStatus("Paper state saved.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["library"] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: paperKey });
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: ({
      nextUserPaperId,
      body,
    }: {
      nextUserPaperId: string;
      body: string;
    }) => postNote(nextUserPaperId, body),
    onMutate: () => {
      setStatus(null);
    },
    onSuccess: (result, input) => {
      queryClient.setQueryData<PaperPageResponse>(paperKey, (current) =>
        current && "paper" in current
          ? {
              ...current,
              privateNote: {
                id: result.noteId,
                body: input.body,
              },
            }
          : current,
      );
      setStatus("Private note saved.");
    },
    onError: (error) => {
      setStatus(error instanceof Error ? error.message : "Note save failed");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: deleteNoteApi,
    onMutate: async () => {
      setStatus(null);
      await queryClient.cancelQueries({ queryKey: paperKey });
      const previous = queryClient.getQueryData<PaperPageResponse>(paperKey);

      queryClient.setQueryData<PaperPageResponse>(paperKey, (current) =>
        current && "paper" in current
          ? { ...current, privateNote: null }
          : current,
      );
      setNoteBody("");

      return { previous };
    },
    onError: (error, _nextUserPaperId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(paperKey, context.previous);
      }
      setStatus(error instanceof Error ? error.message : "Note delete failed");
    },
    onSuccess: () => {
      setStatus("Private note deleted.");
    },
  });

  const visibleCommentMutation = useMutation({
    mutationFn: ({
      nextUserPaperId,
      value,
    }: {
      nextUserPaperId: string;
      value: string | null;
    }) => postVisibleComment(nextUserPaperId, value),
    onMutate: async ({ value }) => {
      setStatus(null);
      await queryClient.cancelQueries({ queryKey: paperKey });
      const previous = queryClient.getQueryData<PaperPageResponse>(paperKey);

      patchUserPaper({ visible_comment: value });
      setVisibleComment(value ?? "");

      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(paperKey, context.previous);
        if ("paper" in context.previous) {
          setVisibleComment(context.previous.userPaper?.visible_comment ?? "");
        }
      }
      setStatus(
        error instanceof Error ? error.message : "Visible comment save failed",
      );
    },
    onSuccess: (_result, input) => {
      setStatus(
        input.value ? "Visible comment saved." : "Visible comment cleared.",
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["library"] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: paperKey });
    },
  });

  function savePaper() {
    savePaperMutation.mutate();
  }

  function removePaper() {
    if (!userPaperId) {
      return;
    }

    const needsConfirmation = Boolean(noteBody.trim() || visibleComment.trim());

    if (
      needsConfirmation &&
      !window.confirm(
        "Remove this paper, archive your private note, and hide your visible comment?",
      )
    ) {
      return;
    }

    removePaperMutation.mutate(userPaperId);
  }

  function updateUserPaper(patch: Record<string, unknown>) {
    if (!userPaperId) {
      return;
    }

    updateUserPaperMutation.mutate({ nextUserPaperId: userPaperId, patch });
  }

  function saveNote() {
    if (!userPaperId) {
      return;
    }

    saveNoteMutation.mutate({ nextUserPaperId: userPaperId, body: noteBody });
  }

  function deleteNote() {
    if (!userPaperId) {
      return;
    }

    deleteNoteMutation.mutate(userPaperId);
  }

  function saveVisibleComment(value: string | null) {
    if (!userPaperId) {
      return;
    }

    visibleCommentMutation.mutate({ nextUserPaperId: userPaperId, value });
  }

  if (paperQuery.isLoading) {
    return <section className="surface empty-state">Loading</section>;
  }

  if (!data) {
    return (
      <section className="surface empty-state">
        <h2>Paper unavailable</h2>
        {paperQuery.error ? (
          <p>
            {paperQuery.error instanceof Error
              ? paperQuery.error.message
              : "Paper load failed"}
          </p>
        ) : null}
        {status ? <p>{status}</p> : null}
      </section>
    );
  }

  return (
    <div className="paper-page-layout">
      <section className="paper-main">
        <header className="page-header">
          <div>
            <h1 className="page-title">{data.paper.title}</h1>
            {metadataLine ? (
              <p className="page-subtitle">{metadataLine}</p>
            ) : null}
          </div>
        </header>
        <section className="surface empty-state">
          <h2>Abstract</h2>
          {data.paper.abstract ? (
            <p className="paper-abstract">{data.paper.abstract}</p>
          ) : (
            <p className="muted-text">No abstract available.</p>
          )}
          <div className="source-links">
            {data.paper.canonical_url ? (
              <a className="button" href={data.paper.canonical_url}>
                Source
              </a>
            ) : null}
            {data.paper.pdf_url ? (
              <a className="button" href={data.paper.pdf_url}>
                PDF
              </a>
            ) : null}
          </div>
        </section>
        <section className="surface empty-state">
          <h2>Trusted context</h2>
          {data.followedContext.length === 0 ? (
            <p>No followed users have visible activity on this paper.</p>
          ) : (
            <div className="stack">
              {data.followedContext.map((item) => (
                <div className="context-row" key={item.id}>
                  <strong>{item.profile?.name ?? "Beta user"}</strong>
                  <span className="badge">
                    {stateLabels[item.reading_state]}
                  </span>
                  {item.recommendation_signal ? (
                    <span className="badge">
                      {signalLabels[item.recommendation_signal]}
                    </span>
                  ) : null}
                  {item.visible_comment ? <p>{item.visible_comment}</p> : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
      <aside className="paper-actions surface">
        {status ? <div className="status-line">{status}</div> : null}
        {data.userPaper ? (
          <>
            <label>
              <span className="account-label">Your state</span>
              <select
                className="input"
                onChange={(event) =>
                  void updateUserPaper({
                    readingState: event.target.value as ReadingState,
                  })
                }
                value={data.userPaper.reading_state}
              >
                {readingStates.map((state) => (
                  <option key={state} value={state}>
                    {stateLabels[state]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="account-label">Visible signal</span>
              <select
                className="input"
                onChange={(event) =>
                  void updateUserPaper({
                    recommendationSignal:
                      event.target.value === ""
                        ? null
                        : (event.target.value as RecommendationSignal),
                  })
                }
                value={data.userPaper.recommendation_signal ?? ""}
              >
                <option value="">None</option>
                {recommendationSignals.map((signal) => (
                  <option key={signal} value={signal}>
                    {signalLabels[signal]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="account-label">Private note</span>
              <textarea
                className="textarea"
                onChange={(event) => setNoteBody(event.target.value)}
                value={noteBody}
              />
            </label>
            <div className="toolbar">
              <button className="button" onClick={saveNote} type="button">
                Save Note
              </button>
              <button className="button" onClick={deleteNote} type="button">
                Delete Note
              </button>
            </div>
            <label>
              <span className="account-label">Visible comment</span>
              <textarea
                className="textarea"
                maxLength={1000}
                onChange={(event) => setVisibleComment(event.target.value)}
                value={visibleComment}
              />
            </label>
            <div className="toolbar">
              <button
                className="button"
                onClick={() => void saveVisibleComment(visibleComment)}
                type="button"
              >
                Save Comment
              </button>
              <button
                className="button"
                onClick={() => void saveVisibleComment(null)}
                type="button"
              >
                Clear Comment
              </button>
            </div>
            <button className="button" onClick={removePaper} type="button">
              Remove
            </button>
          </>
        ) : (
          <button className="button primary" onClick={savePaper} type="button">
            Save to Library
          </button>
        )}
      </aside>
    </div>
  );
}
