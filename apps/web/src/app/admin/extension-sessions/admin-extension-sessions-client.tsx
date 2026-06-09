"use client";

import { useEffect, useState } from "react";

type ExtensionSession = {
  id: string;
  user_id: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  user_agent: string | null;
  extension_version: string | null;
};

export function AdminExtensionSessionsClient() {
  const [sessions, setSessions] = useState<ExtensionSession[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function loadSessions() {
    setIsLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/admin/extension-sessions");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Sessions load failed");
      }

      setSessions(payload.data.sessions);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Sessions load failed",
      );
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  async function revokeSession(sessionId: string) {
    if (!window.confirm("Revoke this extension session?")) {
      return;
    }

    setRevokingId(sessionId);
    setStatus(null);

    try {
      const response = await fetch("/api/admin/extension-sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Revoke failed");
      }

      setStatus("Extension session revoked.");
      await loadSessions();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Revoke failed");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <section className="surface table-shell">
      {status ? <div className="status-line">{status}</div> : null}
      <table className="data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Created</th>
            <th>Last used</th>
            <th>Status</th>
            <th>Version</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id}>
              <td>
                <div className="paper-cell-title">{session.user_id}</div>
                <div className="paper-cell-meta">
                  {session.user_agent ?? ""}
                </div>
              </td>
              <td>{new Date(session.created_at).toLocaleDateString()}</td>
              <td>
                {session.last_used_at
                  ? new Date(session.last_used_at).toLocaleDateString()
                  : "Never"}
              </td>
              <td>
                <span className="badge">
                  {session.revoked_at ? "Revoked" : "Active"}
                </span>
              </td>
              <td>{session.extension_version ?? ""}</td>
              <td>
                <button
                  className="button"
                  disabled={
                    Boolean(session.revoked_at) || revokingId === session.id
                  }
                  onClick={() => void revokeSession(session.id)}
                  type="button"
                >
                  {revokingId === session.id ? "Revoking" : "Revoke"}
                </button>
              </td>
            </tr>
          ))}
          {!isLoading && sessions.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <div className="empty-state">
                  <h2>No extension sessions</h2>
                </div>
              </td>
            </tr>
          ) : null}
          {isLoading ? (
            <tr>
              <td colSpan={6}>
                <div className="empty-state">
                  <h2>Loading</h2>
                </div>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}
