"use client";

import {
  readingStates,
  sourceTypes,
  type ReadingState,
  type SourceType,
} from "@cairn/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const readingStateLabels: Record<ReadingState, string> = {
  want_to_read: "Want to read",
  reading: "Reading",
  read: "Read",
  deep_read: "Deep read",
  skipped: "Skipped",
};

const sourceTypeLabels: Record<SourceType, string> = {
  arxiv: "arXiv",
  doi: "DOI",
  openreview: "OpenReview",
  semantic_scholar: "Semantic Scholar",
  pdf: "PDF",
  manual: "Manual",
  unknown: "Unknown",
};

type Draft = {
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

type ApiDraft = {
  title?: string | null;
  sourceType?: SourceType | null;
  authors?: string[] | null;
  year?: number | null;
  abstract?: string | null;
  venue?: string | null;
  canonicalUrl?: string | null;
  pdfUrl?: string | null;
  doi?: string | null;
  arxivId?: string | null;
  openreviewId?: string | null;
  semanticScholarId?: string | null;
};

const emptyDraft: Draft = {
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

function draftFromApi(apiDraft: ApiDraft): Draft {
  return {
    title: apiDraft.title ?? "",
    sourceType: apiDraft.sourceType ?? "manual",
    authors: (apiDraft.authors ?? []).join(", "),
    year: apiDraft.year == null ? "" : String(apiDraft.year),
    abstract: apiDraft.abstract ?? "",
    venue: apiDraft.venue ?? "",
    canonicalUrl: apiDraft.canonicalUrl ?? "",
    pdfUrl: apiDraft.pdfUrl ?? "",
    doi: apiDraft.doi ?? "",
    arxivId: apiDraft.arxivId ?? "",
    openreviewId: apiDraft.openreviewId ?? "",
    semanticScholarId: apiDraft.semanticScholarId ?? "",
  };
}

function requiresManualReview(draft: Draft) {
  return !draft.title.trim() || !draft.authors.trim() || !draft.year.trim();
}

function hasDraftContent(draft: Draft) {
  return Boolean(
    draft.title ||
      draft.authors ||
      draft.year ||
      draft.venue ||
      draft.abstract ||
      draft.canonicalUrl ||
      draft.pdfUrl,
  );
}

export function AddPaperForm() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [readingState, setReadingState] =
    useState<ReadingState>("want_to_read");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [status, setStatus] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [hasResolvedDraft, setHasResolvedDraft] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const inputParam = searchParams.get("input") ?? searchParams.get("url");

    if (inputParam) {
      setInput(inputParam);
    }
  }, []);

  async function resolvePaper() {
    setIsResolving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent: "resolve", input }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Resolve failed");
      }

      const nextDraft = draftFromApi(payload.data.draft);

      setDraft(nextDraft);
      setHasResolvedDraft(true);
      setIsManualOpen(requiresManualReview(nextDraft));
      setStatus(
        payload.data.existingPaper
          ? "Existing paper found. Confirm to add it to your library."
          : requiresManualReview(nextDraft)
            ? "Metadata draft ready. Some fields need manual review."
            : "Metadata draft ready.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Resolve failed");
      setDraft({ ...emptyDraft, title: input, sourceType: "manual" });
      setHasResolvedDraft(true);
      setIsManualOpen(true);
    } finally {
      setIsResolving(false);
    }
  }

  function openManualEntry() {
    setDraft((current) =>
      current.title || !input
        ? current
        : { ...current, title: input, sourceType: "manual" },
    );
    setHasResolvedDraft(true);
    setIsManualOpen(true);
    setStatus(null);
  }

  async function savePaper() {
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          intent: "save",
          input,
          readingState,
          paper: {
            title: draft.title,
            sourceType: draft.sourceType,
            authors: draft.authors
              .split(",")
              .map((author) => author.trim())
              .filter(Boolean),
            year: draft.year ? Number(draft.year) : null,
            abstract: draft.abstract || null,
            venue: draft.venue || null,
            canonicalUrl: draft.canonicalUrl || null,
            pdfUrl: draft.pdfUrl || null,
            doi: draft.doi || null,
            arxivId: draft.arxivId || null,
            openreviewId: draft.openreviewId || null,
            semanticScholarId: draft.semanticScholarId || null,
          },
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Save failed");
      }

      router.push("/library");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="surface">
      <div className="form-grid">
        <label>
          <span className="account-label">URL or title</span>
          <input
            className="input"
            onChange={(event) => setInput(event.target.value)}
            placeholder="https://arxiv.org/abs/..."
            type="text"
            value={input}
          />
        </label>
        <label>
          <span className="account-label">Initial state</span>
          <select
            className="input"
            onChange={(event) =>
              setReadingState(event.target.value as ReadingState)
            }
            value={readingState}
          >
            {readingStates.map((state) => (
              <option key={state} value={state}>
                {readingStateLabels[state]}
              </option>
            ))}
          </select>
        </label>
        <div>
          <button
            className="button primary"
            disabled={!input || isResolving}
            onClick={resolvePaper}
            type="button"
          >
            {isResolving ? "Resolving" : "Resolve"}
          </button>
        </div>
        {status ? <div className="status-line">{status}</div> : null}
      </div>

      <div className="form-grid confirmation-grid">
        <div className="collapsible-header">
          <div>
            <h2 className="section-title">Paper details</h2>
            <p className="page-subtitle">
              {hasResolvedDraft && hasDraftContent(draft)
                ? "Save the resolved draft directly, or open manual details to edit missing fields."
                : "Resolve metadata first, or open manual details to add the paper yourself."}
            </p>
          </div>
          <div className="toolbar compact-toolbar">
            <button
              aria-expanded={isManualOpen}
              className="button"
              onClick={() =>
                isManualOpen ? setIsManualOpen(false) : openManualEntry()
              }
              type="button"
            >
              {isManualOpen ? "Hide Manual Details" : "Manual Entry"}
            </button>
          </div>
        </div>
        {hasDraftContent(draft) ? (
          <div className="resolved-summary">
            <strong className="paper-cell-title">
              {draft.title || "Untitled paper"}
            </strong>
            <div className="paper-cell-meta">
              {[draft.authors, draft.year, draft.venue].filter(Boolean).join(" · ")}
            </div>
          </div>
        ) : null}
        {isManualOpen ? (
          <div className="manual-entry-grid">
            <label>
              <span className="account-label">Title</span>
              <input
                className="input"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                value={draft.title}
              />
            </label>
            <label>
              <span className="account-label">Authors</span>
              <input
                className="input"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    authors: event.target.value,
                  }))
                }
                placeholder="Comma-separated"
                value={draft.authors}
              />
            </label>
            <label>
              <span className="account-label">Year</span>
              <input
                className="input"
                inputMode="numeric"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    year: event.target.value,
                  }))
                }
                value={draft.year}
              />
            </label>
            <label>
              <span className="account-label">Source</span>
              <select
                className="input"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    sourceType: event.target.value as SourceType,
                  }))
                }
                value={draft.sourceType}
              >
                {sourceTypes.map((sourceType) => (
                  <option key={sourceType} value={sourceType}>
                    {sourceTypeLabels[sourceType]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="account-label">Venue</span>
              <input
                className="input"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    venue: event.target.value,
                  }))
                }
                value={draft.venue}
              />
            </label>
            <label>
              <span className="account-label">Abstract</span>
              <textarea
                className="textarea"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    abstract: event.target.value,
                  }))
                }
                value={draft.abstract}
              />
            </label>
            <label>
              <span className="account-label">Canonical URL</span>
              <input
                className="input"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    canonicalUrl: event.target.value,
                  }))
                }
                value={draft.canonicalUrl}
              />
            </label>
            <label>
              <span className="account-label">PDF URL</span>
              <input
                className="input"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    pdfUrl: event.target.value,
                  }))
                }
                value={draft.pdfUrl}
              />
            </label>
          </div>
        ) : null}
        <div>
          <button
            className="button primary"
            disabled={!draft.title || isSaving}
            onClick={savePaper}
            type="button"
          >
            {isSaving ? "Saving" : "Save"}
          </button>
        </div>
      </div>
    </section>
  );
}
