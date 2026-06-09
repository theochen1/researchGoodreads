"use client";

import { sourceTypes, type SourceType } from "@cairn/shared";
import { useEffect, useState } from "react";

type AdminPaper = {
  id: string;
  title: string;
  source_type: SourceType;
  authors: string[] | null;
  year: number | null;
  abstract: string | null;
  venue: string | null;
  canonical_url: string | null;
  pdf_url: string | null;
  doi: string | null;
  arxiv_id: string | null;
  openreview_id: string | null;
  semantic_scholar_id: string | null;
  updated_at: string;
};

type PaperForm = {
  paperId: string;
  title: string;
  sourceType: SourceType;
  authors: string;
  year: string;
  abstract: string;
  venue: string;
  canonicalUrl: string;
  pdfUrl: string;
  doi: string;
  arxivId: string;
  openreviewId: string;
  semanticScholarId: string;
};

const emptyForm: PaperForm = {
  paperId: "",
  title: "",
  sourceType: "manual",
  authors: "",
  year: "",
  abstract: "",
  venue: "",
  canonicalUrl: "",
  pdfUrl: "",
  doi: "",
  arxivId: "",
  openreviewId: "",
  semanticScholarId: "",
};

export function AdminPapersClient() {
  const [papers, setPapers] = useState<AdminPaper[]>([]);
  const [form, setForm] = useState<PaperForm>(emptyForm);
  const [duplicatePaperId, setDuplicatePaperId] = useState("");
  const [survivingPaperId, setSurvivingPaperId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadPapers() {
    setIsLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/admin/papers");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Papers load failed");
      }

      setPapers(payload.data.papers);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Papers load failed");
      setPapers([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPapers();
  }, []);

  function selectPaper(paper: AdminPaper) {
    setForm({
      paperId: paper.id,
      title: paper.title,
      sourceType: paper.source_type,
      authors: paper.authors?.join(", ") ?? "",
      year: paper.year ? String(paper.year) : "",
      abstract: paper.abstract ?? "",
      venue: paper.venue ?? "",
      canonicalUrl: paper.canonical_url ?? "",
      pdfUrl: paper.pdf_url ?? "",
      doi: paper.doi ?? "",
      arxivId: paper.arxiv_id ?? "",
      openreviewId: paper.openreview_id ?? "",
      semanticScholarId: paper.semantic_scholar_id ?? "",
    });
  }

  async function saveMetadata() {
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch(`/api/admin/papers/${form.paperId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          sourceType: form.sourceType,
          authors: form.authors
            ? form.authors
                .split(",")
                .map((author) => author.trim())
                .filter(Boolean)
            : null,
          year: form.year ? Number(form.year) : null,
          abstract: form.abstract || null,
          venue: form.venue || null,
          canonicalUrl: form.canonicalUrl || null,
          pdfUrl: form.pdfUrl || null,
          doi: form.doi || null,
          arxivId: form.arxivId || null,
          openreviewId: form.openreviewId || null,
          semanticScholarId: form.semanticScholarId || null,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Metadata save failed");
      }

      setStatus("Paper metadata saved.");
      await loadPapers();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Metadata save failed",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function mergePapers() {
    if (
      !window.confirm(
        "Merge the duplicate paper into the surviving paper? This rewrites user-paper relationships.",
      )
    ) {
      return;
    }

    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/admin/papers/merge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ duplicatePaperId, survivingPaperId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Merge failed");
      }

      setDuplicatePaperId("");
      setSurvivingPaperId("");
      setStatus("Duplicate paper merged.");
      await loadPapers();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Merge failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="stack">
      <section className="surface">
        <div className="form-grid">
          <h2 className="section-title">Edit paper metadata</h2>
          <div className="admin-two-column-form">
            <input
              className="input"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  paperId: event.target.value,
                }))
              }
              placeholder="Paper ID"
              value={form.paperId}
            />
            <input
              className="input"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Title"
              value={form.title}
            />
            <select
              className="input"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sourceType: event.target.value as SourceType,
                }))
              }
              value={form.sourceType}
            >
              {sourceTypes.map((sourceType) => (
                <option key={sourceType} value={sourceType}>
                  {sourceType}
                </option>
              ))}
            </select>
            <input
              className="input"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  authors: event.target.value,
                }))
              }
              placeholder="Authors, comma-separated"
              value={form.authors}
            />
            <input
              className="input"
              inputMode="numeric"
              onChange={(event) =>
                setForm((current) => ({ ...current, year: event.target.value }))
              }
              placeholder="Year"
              value={form.year}
            />
            <input
              className="input"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  venue: event.target.value,
                }))
              }
              placeholder="Venue"
              value={form.venue}
            />
            <input
              className="input"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  canonicalUrl: event.target.value,
                }))
              }
              placeholder="Canonical URL"
              value={form.canonicalUrl}
            />
            <input
              className="input"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  pdfUrl: event.target.value,
                }))
              }
              placeholder="PDF URL"
              value={form.pdfUrl}
            />
            <input
              className="input"
              onChange={(event) =>
                setForm((current) => ({ ...current, doi: event.target.value }))
              }
              placeholder="DOI"
              value={form.doi}
            />
            <input
              className="input"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  arxivId: event.target.value,
                }))
              }
              placeholder="arXiv ID"
              value={form.arxivId}
            />
            <input
              className="input"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  openreviewId: event.target.value,
                }))
              }
              placeholder="OpenReview ID"
              value={form.openreviewId}
            />
            <input
              className="input"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  semanticScholarId: event.target.value,
                }))
              }
              placeholder="Semantic Scholar ID"
              value={form.semanticScholarId}
            />
          </div>
          <textarea
            className="textarea"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                abstract: event.target.value,
              }))
            }
            placeholder="Abstract"
            value={form.abstract}
          />
          <button
            className="button primary"
            disabled={!form.paperId || !form.title || isSaving}
            onClick={saveMetadata}
            type="button"
          >
            {isSaving ? "Saving" : "Save Metadata"}
          </button>
        </div>
      </section>
      <section className="surface">
        <div className="form-grid">
          <h2 className="section-title">Merge duplicate papers</h2>
          <div className="admin-inline-form">
            <input
              className="input"
              onChange={(event) => setDuplicatePaperId(event.target.value)}
              placeholder="Duplicate paper ID"
              value={duplicatePaperId}
            />
            <input
              className="input"
              onChange={(event) => setSurvivingPaperId(event.target.value)}
              placeholder="Surviving paper ID"
              value={survivingPaperId}
            />
            <button
              className="button primary"
              disabled={!duplicatePaperId || !survivingPaperId || isSaving}
              onClick={mergePapers}
              type="button"
            >
              Merge
            </button>
          </div>
        </div>
      </section>
      {status ? <div className="status-line">{status}</div> : null}
      <section className="surface table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>Paper</th>
              <th>Identifiers</th>
              <th>Source</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {papers.map((paper) => (
              <tr key={paper.id}>
                <td>
                  <div className="paper-cell-title">{paper.title}</div>
                  <div className="paper-cell-meta">{paper.id}</div>
                </td>
                <td>
                  {[paper.doi, paper.arxiv_id, paper.openreview_id]
                    .filter(Boolean)
                    .join(" / ")}
                </td>
                <td>{paper.source_type}</td>
                <td>{new Date(paper.updated_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className="button"
                    onClick={() => selectPaper(paper)}
                    type="button"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && papers.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <h2>No papers loaded</h2>
                  </div>
                </td>
              </tr>
            ) : null}
            {isLoading ? (
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
    </div>
  );
}
