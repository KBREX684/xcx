"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { SidebarNavigation } from "./sidebar-navigation";
import { SidebarCollapseIcon, SidebarExpandIcon, UserIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";

const sidebarStorageKey = "acp-sidebar-collapsed";

export type AppNavKey =
  | "none"
  | "dashboard"
  | "team"
  | "messages"
  | "projects"
  | "approvals"
  | "agents"
  | "workflows"
  | "certificates"
  | "settings";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type NavBadgeMap = Partial<Record<AppNavKey, number>>;

type AppShellProps = {
  activeNav: AppNavKey;
  title: string;
  description: string;
  breadcrumbs?: BreadcrumbItem[];
  navBadges?: NavBadgeMap;
  profileName?: string;
  profileEmail?: string;
  workspaceName?: string;
  children: ReactNode;
};

export function AppShell({
  activeNav,
  title,
  description,
  breadcrumbs = [],
  navBadges,
  profileName = "KBREX",
  profileEmail = "kbrex@example.com",
  workspaceName = "KBREX Studio",
  children
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem(sidebarStorageKey) === "true");
    } catch {
      setSidebarCollapsed(false);
    }
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(sidebarStorageKey, next ? "true" : "false");
      } catch {
        // Ignore storage failures so the layout still works.
      }

      return next;
    });
  }

  return (
    <div className="app-shell" data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}>
      <aside className="app-sidebar">
        <div className="app-sidebar-toolbar">
          <button
            type="button"
            className="chrome-toggle-button"
            aria-label="收起侧边栏"
            title="收起侧边栏"
            onClick={toggleSidebar}
          >
            <SidebarCollapseIcon />
          </button>
        </div>

        <SidebarNavigation
          activeNav={activeNav}
          navBadges={navBadges}
          profileName={profileName}
          profileEmail={profileEmail}
          workspaceName={workspaceName}
        />
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="page-title-group">
            <details className="mobile-nav">
              <summary className="mobile-nav-trigger">
                <span className="mobile-nav-trigger-icon">
                  <UserIcon />
                </span>
                <span>导航</span>
              </summary>
              <div className="mobile-nav-panel">
                <SidebarNavigation
                  activeNav={activeNav}
                  navBadges={navBadges}
                  profileName={profileName}
                  profileEmail={profileEmail}
                  workspaceName={workspaceName}
                  compact
                  showFooter={false}
                />
              </div>
            </details>

            <nav className="breadcrumbs" aria-label="面包屑">
              {breadcrumbs.length === 0 ? (
                <span className="breadcrumb-current">工作台</span>
              ) : (
                breadcrumbs.map((item, index) =>
                  item.href ? (
                    <Link key={`${item.label}-${index}`} href={item.href} className="breadcrumb-link">
                      {item.label}
                    </Link>
                  ) : (
                    <span key={`${item.label}-${index}`} className="breadcrumb-current">
                      {item.label}
                    </span>
                  )
                )
              )}
            </nav>

            <div className="page-heading">
              <h1 className="page-title">{title}</h1>
              <p className="page-description">{description}</p>
            </div>
          </div>

          <div className="topbar-actions">
            {sidebarCollapsed ? (
              <button
                type="button"
                className="chrome-toggle-button shell-reveal-button"
                aria-label="展开侧边栏"
                title="展开侧边栏"
                onClick={toggleSidebar}
              >
                <SidebarExpandIcon />
              </button>
            ) : null}
            <ThemeToggle />
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
