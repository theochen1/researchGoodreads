import { requirePageUser } from "@/lib/server/page-auth";
import { AddPaperForm } from "./add-paper-form";

export const dynamic = "force-dynamic";

export default async function AddPaperPage() {
  await requirePageUser();

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Add Paper</h1>
          <p className="page-subtitle">
            Paste a paper link, resolve metadata, then save with an initial
            reading state.
          </p>
        </div>
      </header>
      <AddPaperForm />
    </>
  );
}
