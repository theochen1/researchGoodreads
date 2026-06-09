export default function AccessPendingPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Access pending</h1>
          <p className="page-subtitle">
            This Google account is not currently invited or approved for the
            Cairn beta.
          </p>
        </div>
      </header>
      <section className="surface empty-state">
        <h2>Invite required</h2>
        <p>
          Ask a builder to approve the account you used, then sign in again.
        </p>
      </section>
    </>
  );
}
