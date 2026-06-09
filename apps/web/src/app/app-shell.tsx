"use client";

import type { MouseEvent } from "react";
import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Library,
  Newspaper,
  PlusCircle,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

type CurrentProfile = {
  name: string;
  username: string;
} | null;

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Duplicate React type graphs can appear in the monorepo install on Vercel.
// Keep the boundary untyped here and let React handle the runtime child shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppShellChildren = any;

const navItems: NavigationItem[] = [
  { href: "/library", label: "Library", icon: Library },
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/add", label: "Add Paper", icon: PlusCircle },
  { href: "/people", label: "People", icon: Users },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

export function AppShell({
  children,
  profile,
}: {
  children: AppShellChildren;
  profile: CurrentProfile;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  const navigationLabel = useMemo(
    () => pendingLabel ?? "Loading",
    [pendingLabel],
  );

  useEffect(() => {
    setPendingHref(null);
    setPendingLabel(null);
  }, [pathname]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    for (const item of navItems) {
      router.prefetch(item.href);
    }

    router.prefetch("/admin");
  }, [profile, router]);

  function navigate(
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
    label: string,
  ) {
    if (isModifiedClick(event) || href === pathname) {
      return;
    }

    event.preventDefault();
    setPendingHref(href);
    setPendingLabel(label);
    startTransition(() => {
      router.push(href);
    });
  }

  const isNavigating = Boolean(pendingHref);

  return (
    <div className="app-shell">
      {isNavigating ? (
        <div aria-live="polite" className="navigation-progress" role="status">
          <span className="navigation-progress-bar" />
          <span className="navigation-progress-label">
            Loading {navigationLabel}
          </span>
        </div>
      ) : null}
      <aside className="sidebar">
        <div className="brand">
          <Link
            href="/library"
            className="brand-name"
            onClick={(event) => navigate(event, "/library", "Library")}
          >
            Cairn
          </Link>
          <div className="brand-mark" aria-hidden="true" />
        </div>
        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className="nav-link"
                href={item.href}
                key={item.href}
                onClick={(event) => navigate(event, item.href, item.label)}
              >
                <Icon aria-hidden="true" size={17} strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="account">
          <div className="account-label">Account</div>
          <div className="account-name">
            {profile ? profile.name : "Not signed in"}
          </div>
          <div className="account-actions">
            {profile ? (
              <Link
                href="/profile"
                onClick={(event) => navigate(event, "/profile", "Profile")}
              >
                @{profile.username}
              </Link>
            ) : null}
            <Link
              href="/login"
              onClick={(event) => navigate(event, "/login", "Sign in")}
            >
              Sign in
            </Link>
            <Link href="/auth/sign-out">Logout</Link>
          </div>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
