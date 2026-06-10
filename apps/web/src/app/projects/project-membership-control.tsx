"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  paperCount: number;
};

type AssignedProject = {
  id: string;
  name: string;
};

type ProjectMembershipControlProps = {
  availableProjects: ProjectSummary[];
  assignedProjects: AssignedProject[];
  userPaperId: string | null;
  paperQueryKey?: readonly unknown[];
  projectQueryKey?: readonly unknown[];
};

async function addPaperToProject(projectId: string, userPaperId: string) {
  const response = await fetch(`/api/projects/${projectId}/papers`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userPaperId }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Project update failed");
  }

  return payload.data as { added: true; projectId: string; userPaperId: string };
}

async function removePaperFromProject(projectId: string, userPaperId: string) {
  const response = await fetch(`/api/projects/${projectId}/papers`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userPaperId }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Project update failed");
  }

  return payload.data as {
    removed: true;
    projectId: string;
    userPaperId: string;
  };
}

export function ProjectMembershipControl({
  availableProjects,
  assignedProjects,
  userPaperId,
  paperQueryKey,
  projectQueryKey,
}: ProjectMembershipControlProps) {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [localProjects, setLocalProjects] =
    useState<AssignedProject[]>(assignedProjects);

  useEffect(() => {
    setLocalProjects(assignedProjects);
  }, [assignedProjects]);

  const assignedProjectIds = useMemo(
    () => new Set(localProjects.map((project) => project.id)),
    [localProjects],
  );
  const availableOptions = useMemo(
    () =>
      availableProjects.filter((project) => !assignedProjectIds.has(project.id)),
    [assignedProjectIds, availableProjects],
  );

  function invalidateRelatedQueries(projectId?: string) {
    void queryClient.invalidateQueries({ queryKey: ["library"] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });

    if (paperQueryKey) {
      void queryClient.invalidateQueries({ queryKey: paperQueryKey });
    }

    if (projectQueryKey) {
      void queryClient.invalidateQueries({ queryKey: projectQueryKey });
    }

    if (projectId) {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    }
  }

  const addMutation = useMutation({
    mutationFn: ({ projectId, nextUserPaperId }: { projectId: string; nextUserPaperId: string }) =>
      addPaperToProject(projectId, nextUserPaperId),
    onMutate: ({ projectId }) => {
      setStatus(null);
      const project = availableProjects.find((entry) => entry.id === projectId);

      if (project) {
        setLocalProjects((current) =>
          current.some((entry) => entry.id === project.id)
            ? current
            : [...current, { id: project.id, name: project.name }].sort((left, right) =>
                left.name.localeCompare(right.name),
              ),
        );
      }
    },
    onSuccess: (_result, input) => {
      const project = availableProjects.find((entry) => entry.id === input.projectId);
      setSelectedProjectId("");
      setStatus(project ? `Added to ${project.name}.` : "Added to project.");
      invalidateRelatedQueries(input.projectId);
    },
    onError: (error) => {
      setLocalProjects(assignedProjects);
      setStatus(error instanceof Error ? error.message : "Project update failed");
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ projectId, nextUserPaperId }: { projectId: string; nextUserPaperId: string }) =>
      removePaperFromProject(projectId, nextUserPaperId),
    onMutate: ({ projectId }) => {
      setStatus(null);
      setLocalProjects((current) =>
        current.filter((project) => project.id !== projectId),
      );
    },
    onSuccess: (_result, input) => {
      const project = availableProjects.find((entry) => entry.id === input.projectId);
      setStatus(
        project ? `Removed from ${project.name}.` : "Removed from project.",
      );
      invalidateRelatedQueries(input.projectId);
    },
    onError: (error) => {
      setLocalProjects(assignedProjects);
      setStatus(error instanceof Error ? error.message : "Project update failed");
    },
  });

  function addSelectedProject() {
    if (!userPaperId || !selectedProjectId) {
      return;
    }

    addMutation.mutate({ projectId: selectedProjectId, nextUserPaperId: userPaperId });
  }

  function removeProject(projectId: string) {
    if (!userPaperId) {
      return;
    }

    removeMutation.mutate({ projectId, nextUserPaperId: userPaperId });
  }

  return (
    <div className="project-membership-control">
      <div className="project-membership-header">
        <span className="account-label">Projects</span>
        {!userPaperId ? (
          <span className="muted-text">Save to library to organize.</span>
        ) : null}
      </div>
      {localProjects.length > 0 ? (
        <div className="project-chip-list">
          {localProjects.map((project) => (
            <div className="project-chip" key={project.id}>
              <Link href={`/projects/${project.id}`}>{project.name}</Link>
              {userPaperId ? (
                <button
                  aria-label={`Remove from ${project.name}`}
                  className="project-chip-remove"
                  onClick={() => removeProject(project.id)}
                  type="button"
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted-text">Not assigned to a project.</p>
      )}
      {userPaperId ? (
        availableProjects.length > 0 ? (
          <div className="project-membership-actions">
            <select
              className="control"
              onChange={(event) => setSelectedProjectId(event.target.value)}
              value={selectedProjectId}
            >
              <option value="">Add to project</option>
              {availableOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              className="button"
              disabled={!selectedProjectId || addMutation.isPending}
              onClick={addSelectedProject}
              type="button"
            >
              {addMutation.isPending ? "Adding" : "Add"}
            </button>
          </div>
        ) : (
          <p className="muted-text">
            No projects yet. <Link href="/projects">Create one</Link>.
          </p>
        )
      ) : null}
      {status ? <div className="status-line compact">{status}</div> : null}
    </div>
  );
}
