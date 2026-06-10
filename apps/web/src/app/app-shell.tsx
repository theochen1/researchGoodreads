"use client";

import type { MouseEvent, ReactNode } from "react";
import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  Shield,
  Library,
  Newspaper,
  FolderOpen,
  PlusCircle,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

type CurrentProfile = {
  name: string;
  username: string;
  isAdmin: boolean;
} | null;

type RecentProject = {
  id: string;
  name: string;
  paperCount: number;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavigationItem[] = [
  { href: "/library", label: "Library", icon: Library },
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/add", label: "Add Paper", icon: PlusCircle },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/people", label: "People", icon: Users },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

const adminNavItem: NavigationItem = {
  href: "/admin",
  label: "Admin",
  icon: Shield,
};

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
  recentProjects,
}: {
  children: ReactNode;
  profile: CurrentProfile;
  recentProjects: RecentProject[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const visibleNavItems = useMemo(
    () => (profile?.isAdmin ? [...navItems, adminNavItem] : navItems),
    [profile],
  );

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

    for (const item of visibleNavItems) {
      router.prefetch(item.href);
    }
  }, [profile, router, visibleNavItems]);

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
  const activeNavItem = visibleNavItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

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
          <div>
            <div className="sidebar-section-label">Research workspace</div>
            <Link
              href="/library"
              className="brand-name"
              onClick={(event) => navigate(event, "/library", "Library")}
            >
              Cairn
            </Link>
          </div>
          <div className="brand-mark" aria-hidden="true" />
        </div>
        <div className="sidebar-stack">
          <div className="sidebar-section">
            <div className="sidebar-section-label">Workspace</div>
            <nav className="nav-list" aria-label="Primary navigation">
              {visibleNavItems.map((item) => {
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
          </div>
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <div className="sidebar-section-label">Spaces</div>
              <Link
                className="sidebar-section-action"
                href="/projects"
                onClick={(event) => navigate(event, "/projects", "Projects")}
              >
                View all
              </Link>
            </div>
            <div className="sidebar-spaces">
              {recentProjects.length > 0 ? (
                recentProjects.map((project) => {
                  const isActive =
                    pathname === `/projects/${project.id}` ||
                    pathname.startsWith(`/projects/${project.id}/`);

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className="sidebar-space-link"
                      href={`/projects/${project.id}`}
                      key={project.id}
                      onClick={(event) =>
                        navigate(event, `/projects/${project.id}`, project.name)
                      }
                    >
                      <span className="sidebar-space-name">{project.name}</span>
                      <span className="sidebar-space-meta">
                        {project.paperCount}
                      </span>
                    </Link>
                  );
                })
              ) : (
                <div className="sidebar-empty-copy">
                  No spaces yet
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="account">
          <div className="account-label">Account</div>
          <div className="account-name">
            {profile ? profile.name : "Not signed in"}
          </div>
          <div className="account-actions">
            {profile ? (
              <>
                <Link
                  href="/profile"
                  onClick={(event) => navigate(event, "/profile", "Profile")}
                >
                  @{profile.username}
                </Link>
                <form action="/auth/sign-out" method="post">
                  <button className="account-action-button" type="submit">
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                onClick={(event) => navigate(event, "/login", "Sign in")}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </aside>
      <main className="main">
        <div className="workspace-header">
          <div className="workspace-header-copy">
            <div className="workspace-breadcrumb">
              <span>Workspace</span>
              <ChevronRight aria-hidden="true" size={14} strokeWidth={2} />
              <span>{activeNavItem?.label ?? "Library"}</span>
            </div>
            <div className="workspace-header-title">
              {activeNavItem?.href === "/projects"
                ? "Spaces hold active research campaigns."
                : "Threads hold the papers moving through your work."}
            </div>
          </div>
          <div className="workspace-header-actions">
            <Link
              className="workspace-action"
              href="/add"
              onClick={(event) => navigate(event, "/add", "Add Paper")}
            >
              Add thread
            </Link>
            <Link
              className="workspace-action"
              href="/projects"
              onClick={(event) => navigate(event, "/projects", "Projects")}
            >
              Open spaces
            </Link>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
