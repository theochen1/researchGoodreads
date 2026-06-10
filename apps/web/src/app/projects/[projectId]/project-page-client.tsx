"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReadingState, RecommendationSignal } from "@cairn/shared";

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

type ProjectDetailPayload = {
  project: {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    paperCount: number;
  };
  items: {
    projectAddedAt: string;
    userPaper: {
      id: string;
      reading_state: ReadingState;
      recommendation_signal: RecommendationSignal | null;
      visible_comment: string | null;
      added_at: string;
      latest_visible_at: string;
      papers: {
        id: string;
        title: string;
        authors: string[] | null;
        year: number | null;
        venue: string | null;
        abstract: string | null;
      } | null;
    };
  }[];
};

async function fetchProject(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Project load failed");
  }

  return payload.data as ProjectDetailPayload;
}

async function removeProjectPaper(projectId: string, userPaperId: string) {
  const response = await fetch(`/api/projects/${projectId}/papers`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userPaperId }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Project update failed");
  }

  return payload.data as { removed: true };
}

async function deleteProject(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "DELETE",
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Project delete failed");
  }

  return payload.data as { deleted: true };
}

export function ProjectPageClient({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string | null>(null);
  const projectKey = useMemo(() => ["project", projectId] as const, [projectId]);

  const projectQuery = useQuery({
    queryKey: projectKey,
    queryFn: () => fetchProject(projectId),
  });

  const removePaperMutation = useMutation({
    mutationFn: (userPaperId: string) => removeProjectPaper(projectId, userPaperId),
    onMutate: async (userPaperId) => {
      setStatus(null);
      await queryClient.cancelQueries({ queryKey: projectKey });
      const previous = queryClient.getQueryData<ProjectDetailPayload>(projectKey);

      queryClient.setQueryData<ProjectDetailPayload>(projectKey, (current) =>
        current
          ? {
              ...current,
              project: {
                ...current.project,
                paperCount: Math.max(0, current.project.paperCount - 1),
              },
              items: current.items.filter((item) => item.userPaper.id !== userPaperId),
            }
          : current,
      );

      return { previous };
    },
    onSuccess: () => {
      setStatus("Removed from project.");
    },
    onError: (error, _userPaperId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(projectKey, context.previous);
      }
      setStatus(error instanceof Error ? error.message : "Project update failed");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectKey });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["library"] });
      void queryClient.invalidateQueries({ queryKey: ["paper"] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => deleteProject(projectId),
    onMutate: () => {
      setStatus(null);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      window.location.assign("/projects");
    },
    onError: (error) => {
      setStatus(error instanceof Error ? error.message : "Project delete failed");
    },
  });

  const project = projectQuery.data?.project;
  const items = projectQuery.data?.items ?? [];

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">{project?.name ?? "Project"}</h1>
          <p className="page-subtitle">
            {project?.description || "A private working set carved out of your library."}
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="button" href="/projects">
            All Projects
          </Link>
          <button
            className="button"
            disabled={deleteProjectMutation.isPending}
            onClick={() => {
              if (window.confirm("Delete this project? Papers stay in your library.")) {
                deleteProjectMutation.mutate();
              }
            }}
            type="button"
          >
            {deleteProjectMutation.isPending ? "Deleting" : "Delete Project"}
          </button>
        </div>
      </header>
      <div className="filter-status">
        <span className="badge">{project?.paperCount ?? items.length} papers</span>
        {project ? (
          <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
        ) : null}
      </div>
      {status ? <div className="status-line">{status}</div> : null}
      {projectQuery.error ? (
        <div className="status-line">
          {projectQuery.error instanceof Error
            ? projectQuery.error.message
            : "Project load failed"}
        </div>
      ) : null}
      <section className="surface table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>Paper</th>
              <th>State</th>
              <th>Signal</th>
              <th>Added</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.userPaper.id}>
                <td>
                  <div className="paper-cell-title">
                    {item.userPaper.papers?.id ? (
                      <Link href={`/papers/${item.userPaper.papers.id}`}>
                        {item.userPaper.papers.title}
                      </Link>
                    ) : (
                      "Untitled paper"
                    )}
                  </div>
                  <div className="paper-cell-meta">
                    {[
                      item.userPaper.papers?.authors?.join(", "),
                      item.userPaper.papers?.year,
                      item.userPaper.papers?.venue,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </td>
                <td>{stateLabels[item.userPaper.reading_state]}</td>
                <td>
                  {item.userPaper.recommendation_signal
                    ? signalLabels[item.userPaper.recommendation_signal]
                    : "None"}
                </td>
                <td>{new Date(item.projectAddedAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="button"
                    onClick={() => removePaperMutation.mutate(item.userPaper.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {!projectQuery.isLoading && items.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <h2>No papers yet</h2>
                    <p>
                      Add papers from <Link href="/library">Library</Link> or a paper
                      detail page.
                    </p>
                  </div>
                </td>
              </tr>
            ) : null}
            {projectQuery.isLoading ? (
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
      </section>
    </>
  );
}
