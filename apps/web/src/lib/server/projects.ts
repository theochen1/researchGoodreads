import { notFound } from "../api/errors";
import { createServiceRoleClient } from "./supabase";

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  paperCount: number;
};

export type UserPaperProjectSummary = {
  id: string;
  name: string;
};

export type ProjectPaperItem = {
  projectAddedAt: string;
  userPaper: {
    id: string;
    reading_state: string;
    recommendation_signal: string | null;
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
      source_type: string;
      canonical_url: string | null;
      pdf_url: string | null;
    } | null;
  };
};

export async function listProjectsForUser(
  userId: string,
): Promise<ProjectSummary[]> {
  const serviceClient = createServiceRoleClient();
  const { data: projects, error: projectsError } = await serviceClient
    .from("projects")
    .select("id,name,description,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (projectsError) {
    throw projectsError;
  }

  const projectIds = (projects ?? []).map((project) => project.id);
  const { data: memberships, error: membershipsError } =
    projectIds.length > 0
      ? await serviceClient
          .from("project_papers")
          .select("project_id,user_paper_id")
          .in("project_id", projectIds)
      : { data: [], error: null };

  if (membershipsError) {
    throw membershipsError;
  }

  const userPaperIds = [...new Set((memberships ?? []).map((row) => row.user_paper_id))];
  const { data: activeUserPapers, error: activeUserPapersError } =
    userPaperIds.length > 0
      ? await serviceClient
          .from("user_papers")
          .select("id")
          .eq("user_id", userId)
          .is("removed_at", null)
          .in("id", userPaperIds)
      : { data: [], error: null };

  if (activeUserPapersError) {
    throw activeUserPapersError;
  }

  const activeUserPaperIds = new Set((activeUserPapers ?? []).map((row) => row.id));
  const countsByProjectId = new Map<string, number>();

  for (const membership of memberships ?? []) {
    if (!activeUserPaperIds.has(membership.user_paper_id)) {
      continue;
    }

    countsByProjectId.set(
      membership.project_id,
      (countsByProjectId.get(membership.project_id) ?? 0) + 1,
    );
  }

  return (projects ?? []).map((project) => ({
    ...project,
    paperCount: countsByProjectId.get(project.id) ?? 0,
  }));
}

export async function getProjectForUser(userId: string, projectId: string) {
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("projects")
    .select("id,name,description,created_at,updated_at")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw notFound("Project not found");
  }

  return data;
}

export async function getProjectsForUserPaperIds(
  userId: string,
  userPaperIds: string[],
): Promise<Map<string, UserPaperProjectSummary[]>> {
  const membershipsByUserPaperId = new Map<string, UserPaperProjectSummary[]>();

  if (userPaperIds.length === 0) {
    return membershipsByUserPaperId;
  }

  const projects = await listProjectsForUser(userId);
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const projectIds = projects.map((project) => project.id);

  if (projectIds.length === 0) {
    return membershipsByUserPaperId;
  }

  const serviceClient = createServiceRoleClient();
  const { data: memberships, error: membershipsError } = await serviceClient
    .from("project_papers")
    .select("project_id,user_paper_id")
    .in("project_id", projectIds)
    .in("user_paper_id", userPaperIds);

  if (membershipsError) {
    throw membershipsError;
  }

  for (const membership of memberships ?? []) {
    const project = projectsById.get(membership.project_id);

    if (!project) {
      continue;
    }

    const current = membershipsByUserPaperId.get(membership.user_paper_id) ?? [];
    current.push({ id: project.id, name: project.name });
    membershipsByUserPaperId.set(membership.user_paper_id, current);
  }

  for (const [userPaperId, projectList] of membershipsByUserPaperId) {
    projectList.sort((left, right) => left.name.localeCompare(right.name));
    membershipsByUserPaperId.set(userPaperId, projectList);
  }

  return membershipsByUserPaperId;
}

export async function listProjectPapersForUser(
  userId: string,
  projectId: string,
): Promise<ProjectPaperItem[]> {
  await getProjectForUser(userId, projectId);
  const serviceClient = createServiceRoleClient();
  const { data: memberships, error: membershipsError } = await serviceClient
    .from("project_papers")
    .select("project_id,user_paper_id,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (membershipsError) {
    throw membershipsError;
  }

  const userPaperIds = (memberships ?? []).map((membership) => membership.user_paper_id);

  if (userPaperIds.length === 0) {
    return [];
  }

  const { data: userPapers, error: userPapersError } = await serviceClient
    .from("user_papers")
    .select(
      "id,reading_state,recommendation_signal,visible_comment,added_at,latest_visible_at,papers(id,title,authors,year,venue,abstract,source_type,canonical_url,pdf_url)",
    )
    .eq("user_id", userId)
    .is("removed_at", null)
    .in("id", userPaperIds);

  if (userPapersError) {
    throw userPapersError;
  }

  const userPapersById = new Map(
    (userPapers ?? []).map((userPaper) => [userPaper.id, userPaper]),
  );

  return (memberships ?? [])
    .map<ProjectPaperItem | null>((membership) => {
      const userPaper = userPapersById.get(membership.user_paper_id);

      if (!userPaper) {
        return null;
      }

      const paper =
        Array.isArray(userPaper.papers) ? (userPaper.papers[0] ?? null) : userPaper.papers;

      return {
        projectAddedAt: membership.created_at,
        userPaper: {
          id: userPaper.id,
          reading_state: userPaper.reading_state,
          recommendation_signal: userPaper.recommendation_signal,
          visible_comment: userPaper.visible_comment,
          added_at: userPaper.added_at,
          latest_visible_at: userPaper.latest_visible_at,
          papers: paper,
        },
      };
    })
    .filter((item): item is ProjectPaperItem => Boolean(item));
}
