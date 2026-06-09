"use client";

import { useState } from "react";

export function ExtensionConnectClient() {
  const [status, setStatus] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  async function connectExtension() {
    setStatus(null);
    const response = await fetch("/api/extension/auth-code", {
      method: "POST",
    });
    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error?.message ?? "Connection failed");
      return;
    }

    setCode(payload.data.code);
    setStatus("One-time extension code created.");
    window.postMessage(
      {
        source: "cairn-extension-connect",
        code: payload.data.code,
      },
      window.location.origin,
    );
  }

  return (
    <section className="surface empty-state">
      <h2>Web-mediated extension auth</h2>
      <p>
        This page creates a short-lived one-time code after normal web login.
      </p>
      {status ? <p>{status}</p> : null}
      {code ? <code className="status-line">{code}</code> : null}
      <button
        className="button primary"
        onClick={connectExtension}
        type="button"
      >
        Create Extension Code
      </button>
    </section>
  );
}
