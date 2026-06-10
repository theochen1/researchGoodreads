import Link from "next/link";
import { requirePageUser } from "@/lib/server/page-auth";
import { LibraryTable } from "./library-table";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  await requirePageUser();

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Library</h1>
          <p className="page-subtitle">
            Your paper threads, reading state, and visible signals in one
            scannable research queue.
          </p>
        </div>
        <Link className="button primary" href="/add">
          Add Paper
        </Link>
      </header>
      <LibraryTable />
    </>
  );
}
