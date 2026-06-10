import { requirePageUser } from "@/lib/server/page-auth";
import { ProjectPageClient } from "./project-page-client";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  await requirePageUser();
  const { projectId } = await params;

  return <ProjectPageClient projectId={projectId} />;
}
