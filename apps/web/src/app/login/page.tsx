import Link from "next/link";

export default function LoginPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Sign in</h1>
          <p className="page-subtitle">
            Cairn is invite-only for the v0 research orbit beta. Use the Google
            account attached to your invite or approval.
          </p>
        </div>
      </header>
      <section className="surface empty-state">
        <h2>Google OAuth</h2>
        <p>
          Password auth is intentionally out of scope unless Google OAuth blocks
          a beta participant.
        </p>
        <p>
          <Link className="button primary" href="/auth/sign-in">
            Continue with Google
          </Link>
        </p>
      </section>
    </>
  );
}
