import { requirePageUser } from "@/lib/server/page-auth";
import { FeedList } from "./feed-list";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  await requirePageUser();

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Feed</h1>
          <p className="page-subtitle">
            Trusted thread updates from researchers you follow.
          </p>
        </div>
      </header>
      <FeedList />
    </>
  );
}
