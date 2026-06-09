import { requirePageUser } from "@/lib/server/page-auth";
import { PeopleList } from "./people-list";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  await requirePageUser();

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">People</h1>
          <p className="page-subtitle">
            Follow trusted beta users to shape your paper discovery surface.
          </p>
        </div>
      </header>
      <PeopleList />
    </>
  );
}
