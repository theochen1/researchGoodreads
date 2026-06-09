import { readingStates, type ReadingState } from "@cairn/shared";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

const labels: Record<ReadingState, string> = {
  want_to_read: "Want to read",
  reading: "Reading",
  read: "Read",
  deep_read: "Deep read",
  skipped: "Skipped",
};

type ApiSuccess<T> = {
  data: T;
};

type ExtensionStatus = {
  saved: boolean;
  paper: { id: string; title: string } | null;
  userPaper: { id: string; reading_state: ReadingState } | null;
  paperUrl: string | null;
};

type ExtensionCapture = {
  saved: boolean;
  needsManualFallback: boolean;
  manualUrl?: string;
  paperId?: string;
  paperUrl?: string;
};

const webAppUrl =
  process.env.PLASMO_PUBLIC_WEB_APP_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

function absoluteWebUrl(path: string) {
  return path.startsWith("http") ? path : `${webAppUrl}${path}`;
}

async function readStoredToken() {
  const result = await chrome.storage.local.get("cairnExtensionToken");

  return typeof result.cairnExtensionToken === "string"
    ? result.cairnExtensionToken
    : null;
}

async function apiRequest<T>(path: string, token: string, init?: RequestInit) {
  const response = await fetch(absoluteWebUrl(path), {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  const payload = (await response.json()) as
    | ApiSuccess<T>
    | { error?: { message?: string } };

  if (!response.ok || !("data" in payload)) {
    throw new Error(
      "error" in payload && payload.error?.message
        ? payload.error.message
        : "Request failed",
    );
  }

  return payload.data;
}

export default function Popup() {
  const [token, setToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [tabUrl, setTabUrl] = useState<string | null>(null);
  const [readingState, setReadingState] =
    useState<ReadingState>("want_to_read");
  const [currentStatus, setCurrentStatus] = useState<ExtensionStatus | null>(
    null,
  );
  const [paperUrl, setPaperUrl] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Loading");
  const [isBusy, setIsBusy] = useState(false);

  const canSave = useMemo(
    () => Boolean(token && tabUrl && !isBusy),
    [isBusy, tabUrl, token],
  );

  useEffect(() => {
    async function initializePopup() {
      const storedToken = await readStoredToken();
      setToken(storedToken);

      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      setTabUrl(activeTab?.url ?? null);

      if (!storedToken) {
        setStatusText("Connect your Cairn account to save this page.");
        return;
      }

      if (!activeTab?.url) {
        setStatusText("No readable page URL for this tab.");
        return;
      }

      await refreshStatus(storedToken, activeTab.url);
    }

    void initializePopup().catch((error) => {
      setStatusText(
        error instanceof Error ? error.message : "Could not load extension",
      );
    });
  }, []);

  async function refreshStatus(nextToken = token, nextUrl = tabUrl) {
    if (!nextToken || !nextUrl) {
      return;
    }

    const data = await apiRequest<ExtensionStatus>(
      `/api/extension/status?url=${encodeURIComponent(nextUrl)}`,
      nextToken,
    );
    setCurrentStatus(data);
    setPaperUrl(data.paperUrl ? absoluteWebUrl(data.paperUrl) : null);
    setReadingState(data.userPaper?.reading_state ?? readingState);
    setStatusText(
      data.saved
        ? "This paper is already in your library."
        : "Ready to save this page.",
    );
  }

  async function openConnectPage() {
    await chrome.tabs.create({ url: absoluteWebUrl("/extension/connect") });
  }

  async function exchangeCode() {
    setIsBusy(true);
    setStatusText("Connecting");

    try {
      const response = await fetch(absoluteWebUrl("/api/extension/token"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json()) as
        | ApiSuccess<{ token: string }>
        | { error?: { message?: string } };

      if (!response.ok || !("data" in payload)) {
        throw new Error(
          "error" in payload && payload.error?.message
            ? payload.error.message
            : "Connection failed",
        );
      }

      await chrome.storage.local.set({
        cairnExtensionToken: payload.data.token,
      });
      setToken(payload.data.token);
      setCode("");
      setStatusText("Connected");

      if (tabUrl) {
        await refreshStatus(payload.data.token, tabUrl);
      }
    } catch (error) {
      setStatusText(
        error instanceof Error ? error.message : "Connection failed",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function saveCurrentPage() {
    if (!token || !tabUrl) {
      return;
    }

    setIsBusy(true);
    setManualUrl(null);
    setStatusText("Saving");

    try {
      const data = await apiRequest<ExtensionCapture>(
        "/api/extension/capture",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            url: tabUrl,
            readingState,
          }),
        },
      );

      if (data.needsManualFallback && data.manualUrl) {
        setManualUrl(absoluteWebUrl(data.manualUrl));
        setStatusText("Metadata was not clear enough. Use manual entry.");
        return;
      }

      setPaperUrl(data.paperUrl ? absoluteWebUrl(data.paperUrl) : null);
      setStatusText("Saved to your library.");
      await refreshStatus(token, tabUrl);
    } catch (error) {
      setManualUrl(absoluteWebUrl(`/add?input=${encodeURIComponent(tabUrl)}`));
      setStatusText(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function disconnect() {
    await chrome.storage.local.remove("cairnExtensionToken");
    setToken(null);
    setCurrentStatus(null);
    setPaperUrl(null);
    setStatusText("Disconnected");
  }

  return (
    <main
      style={{
        display: "grid",
        gap: 12,
        minWidth: 340,
        padding: 16,
        color: "#17211b",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Cairn</h1>
        {token ? (
          <button onClick={disconnect} style={linkButtonStyle} type="button">
            Sign out
          </button>
        ) : null}
      </header>

      <p style={{ color: "#5f6b63", fontSize: 13, margin: 0 }}>{statusText}</p>

      {!token ? (
        <section style={{ display: "grid", gap: 8 }}>
          <button
            onClick={openConnectPage}
            style={primaryButtonStyle}
            type="button"
          >
            Open Cairn sign in
          </button>
          <label style={fieldStyle}>
            One-time code
            <input
              onChange={(event) => setCode(event.target.value)}
              placeholder="Paste code"
              style={inputStyle}
              value={code}
            />
          </label>
          <button
            disabled={!code || isBusy}
            onClick={exchangeCode}
            style={secondaryButtonStyle}
            type="button"
          >
            Connect
          </button>
        </section>
      ) : (
        <section style={{ display: "grid", gap: 10 }}>
          {currentStatus?.paper ? (
            <strong style={{ fontSize: 13 }}>
              {currentStatus.paper.title}
            </strong>
          ) : null}
          <label style={fieldStyle}>
            Initial state
            <select
              onChange={(event) =>
                setReadingState(event.target.value as ReadingState)
              }
              style={inputStyle}
              value={readingState}
            >
              {readingStates.map((state) => (
                <option key={state} value={state}>
                  {labels[state]}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={!canSave}
            onClick={saveCurrentPage}
            style={primaryButtonStyle}
            type="button"
          >
            {isBusy ? "Saving" : currentStatus?.saved ? "Update state" : "Save"}
          </button>
          {paperUrl ? (
            <button
              onClick={() => chrome.tabs.create({ url: paperUrl })}
              style={secondaryButtonStyle}
              type="button"
            >
              Open paper page
            </button>
          ) : null}
          {manualUrl ? (
            <button
              onClick={() => chrome.tabs.create({ url: manualUrl })}
              style={secondaryButtonStyle}
              type="button"
            >
              Open manual entry
            </button>
          ) : null}
        </section>
      )}
    </main>
  );
}

const fieldStyle = {
  display: "grid",
  gap: 6,
  fontSize: 13,
} satisfies CSSProperties;

const inputStyle = {
  border: "1px solid #cfd8d2",
  borderRadius: 6,
  boxSizing: "border-box",
  fontSize: 13,
  minHeight: 36,
  padding: "7px 9px",
  width: "100%",
} satisfies CSSProperties;

const primaryButtonStyle = {
  background: "#1c5d3b",
  border: "1px solid #1c5d3b",
  borderRadius: 6,
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 13,
  minHeight: 36,
  padding: "8px 10px",
} satisfies CSSProperties;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  background: "#ffffff",
  color: "#1c5d3b",
} satisfies CSSProperties;

const linkButtonStyle = {
  background: "transparent",
  border: 0,
  color: "#1c5d3b",
  cursor: "pointer",
  fontSize: 12,
  padding: 0,
} satisfies CSSProperties;
