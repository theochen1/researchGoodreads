"use client";

import { useEffect, useState } from "react";

type BetaUser = {
  id: string;
  email: string;
  approved_at: string | null;
  invited_at: string;
  accepted_at: string | null;
  expires_at: string | null;
  is_admin: boolean;
  updated_at: string;
};

export function AdminUsersClient() {
  const [users, setUsers] = useState<BetaUser[]>([]);
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadUsers() {
    setIsLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/admin/users");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Users load failed");
      }

      setUsers(payload.data.users);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Users load failed");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function approveUser() {
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, isAdmin }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Approval failed");
      }

      setEmail("");
      setIsAdmin(false);
      setStatus(`Approved ${payload.data.email}`);
      await loadUsers();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Approval failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="surface">
      <div className="form-grid">
        <div>
          <h2 className="section-title">Invite or approve beta user</h2>
          <p className="page-subtitle">
            Admin API routes handle invite approval and keep admin state out of
            user-editable profile metadata.
          </p>
        </div>
        <form className="admin-inline-form">
          <input
            className="input"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="researcher@example.edu"
            type="email"
            value={email}
          />
          <label className="checkbox-label">
            <input
              checked={isAdmin}
              onChange={(event) => setIsAdmin(event.target.checked)}
              type="checkbox"
            />{" "}
            Admin
          </label>
          <button
            className="button primary"
            disabled={!email || isSaving}
            onClick={approveUser}
            type="button"
          >
            {isSaving ? "Approving" : "Approve"}
          </button>
        </form>
      </div>
      {status ? <div className="status-line">{status}</div> : null}
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th>Admin</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>
                  <span className="badge">
                    {user.approved_at ? "Approved" : "Invited"}
                  </span>
                </td>
                <td>{user.is_admin ? "Yes" : "No"}</td>
                <td>{new Date(user.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!isLoading && users.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <h2>No beta users</h2>
                  </div>
                </td>
              </tr>
            ) : null}
            {isLoading ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <h2>Loading</h2>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
