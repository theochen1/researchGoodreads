"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  paperCount: number;
};

type ProjectsPayload = {
  projects: ProjectSummary[];
};

async function fetchProjects() {
  const response = await fetch("/api/projects");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Projects load failed");
  }

  return payload.data as ProjectsPayload;
}

async function createProject(input: { name: string; description: string }) {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Project create failed");
  }

  return payload.data as { project: ProjectSummary };
}

export function ProjectsPageClient() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const projects = useMemo(
    () => projectsQuery.data?.projects ?? [],
    [projectsQuery.data],
  );

  const createMutation = useMutation({
    mutationFn: createProject,
    onMutate: () => {
      setStatus(null);
    },
    onSuccess: ({ project }) => {
      queryClient.setQueryData<ProjectsPayload>(["projects"], (current) => ({
        projects: [project, ...(current?.projects ?? [])],
      }));
      setName("");
      setDescription("");
      setStatus(`Created ${project.name}.`);
    },
    onError: (error) => {
      setStatus(error instanceof Error ? error.message : "Project create failed");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setStatus("Project name is required.");
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim(),
    });
  }

  return (
    <div className="projects-layout">
      <section className="surface project-create-panel">
        <h2>Create project</h2>
        <p className="muted-text">
          Build private working sets for a paper draft, literature review, or
          experiment track.
        </p>
        <form className="form-grid" onSubmit={submitProject}>
          <label>
            <span className="account-label">Name</span>
            <input
              className="input"
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              placeholder="Mechanistic interpretability survey"
              value={name}
            />
          </label>
          <label>
            <span className="account-label">Description</span>
            <textarea
              className="textarea"
              maxLength={600}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional scope, deadline, or why this bucket exists."
              rows={4}
              value={description}
            />
          </label>
          <button
            className="button primary"
            disabled={createMutation.isPending}
            type="submit"
          >
            {createMutation.isPending ? "Creating" : "Create Project"}
          </button>
        </form>
        {status ? <div className="status-line compact">{status}</div> : null}
      </section>
      <section className="surface projects-list-panel">
        <div className="section-header">
          <h2>Projects</h2>
          <span className="muted-text">{projects.length} total</span>
        </div>
        {projectsQuery.isLoading ? (
          <div className="empty-state">
            <h2>Loading</h2>
          </div>
        ) : null}
        {projectsQuery.error ? (
          <div className="status-line">
            {projectsQuery.error instanceof Error
              ? projectsQuery.error.message
              : "Projects load failed"}
          </div>
        ) : null}
        {!projectsQuery.isLoading && projects.length === 0 ? (
          <div className="empty-state">
            <h2>No projects yet</h2>
            <p>Start with one project and add papers from your library.</p>
          </div>
        ) : null}
        <div className="projects-list">
          {projects.map((project) => (
            <Link className="project-card" href={`/projects/${project.id}`} key={project.id}>
              <div className="project-card-header">
                <h3>{project.name}</h3>
                <span className="badge">{project.paperCount} papers</span>
              </div>
              {project.description ? (
                <p className="project-card-description">{project.description}</p>
              ) : (
                <p className="muted-text">No description</p>
              )}
              <div className="project-card-meta">
                Updated {new Date(project.updated_at).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
