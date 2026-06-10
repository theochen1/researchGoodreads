import { requirePageUser } from "@/lib/server/page-auth";
import { ProjectsPageClient } from "./projects-page-client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  await requirePageUser();

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">
            Organize library papers into private working sets for each research
            campaign.
          </p>
        </div>
      </header>
      <ProjectsPageClient />
    </>
  );
}
