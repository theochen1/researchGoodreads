import Link from "next/link";
import { requireAdmin } from "@/lib/server/auth";

// Vercel resolves multiple React type identities in this workspace.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LayoutChildren = any;

export const dynamic = "force-dynamic";

const adminLinks = [
  { href: "/admin/metrics", label: "Metrics" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/papers", label: "Papers" },
  { href: "/admin/extension-sessions", label: "Extension Sessions" },
];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: LayoutChildren;
}>) {
  await requireAdmin();

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-subtitle">
            Plain beta operations for invites, users, papers, duplicate repair,
            and extension sessions.
          </p>
        </div>
      </header>
      <nav className="toolbar" aria-label="Admin navigation">
        {adminLinks.map((link) => (
          <Link className="button" href={link.href} key={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
