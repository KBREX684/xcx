"use client";

import Link from "next/link";
import { type ReactNode, useSyncExternalStore } from "react";
import { Tooltip } from "@agent-control-plane/ui";
import { BrandLockup, SwarmHiveIcon } from "./brand-mark";
import { SidebarNavigation } from "./sidebar-navigation";
import { SidebarCollapseIcon, SidebarExpandIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { CommandPalette } from "./command-palette";
import { TopProgress } from "./top-progress";
import { navStore } from "./nav-store";
import { logoutAction } from "../lib/auth";

export type AppNavKey =
  | "none"
  | "dashboard"
  | "issues"
  | "myIssues"
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
  description?: string;
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
  breadcrumbs,
  navBadges,
  profileName = "指挥台",
  profileEmail = "",
  workspaceName = "工作区",
  children,
}: AppShellProps) {
  // 从 navStore 订阅，避免路由切换时重建造成的"是否折叠"闪烁。
  const snapshot = useSyncExternalStore(
    navStore.subscribe,
    navStore.getSnapshot,
    navStore.getServerSnapshot,
  );
  const sidebarCollapsed = snapshot.sidebarCollapsed;

  function toggleSidebar() {
    navStore.setSidebarCollapsed(!sidebarCollapsed);
  }

  return (
    <div className="app-shell" data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}>
      <TopProgress />
      <aside className="app-sidebar">
        <div className="app-sidebar-toolbar">
          <Link href="/" className="app-sidebar-brand" aria-label="蜂聚合 SwarmHive 总览">
            <BrandLockup size="sidebar" showEnglish={false} />
          </Link>
          <Tooltip content="收起侧边栏">
            <button
              type="button"
              className="chrome-toggle-button"
              aria-label="收起侧边栏"
              onClick={toggleSidebar}
            >
              <SidebarCollapseIcon />
            </button>
          </Tooltip>
        </div>

        <SidebarNavigation
          activeNav={activeNav}
          navBadges={navBadges}
          profileName={profileName}
          profileEmail={profileEmail}
          workspaceName={workspaceName}
          idPrefix="desktop"
        />
      </aside>

      {sidebarCollapsed ? (
        <Tooltip content="展开侧边栏">
          <button
            type="button"
            className="sidebar-edge-toggle"
            aria-label="展开侧边栏"
            onClick={toggleSidebar}
          >
            <SidebarExpandIcon />
          </button>
        </Tooltip>
      ) : null}

      <div className="app-main">
        <header className="app-topbar">
          <div className="page-title-group">
            <details className="mobile-nav">
              <summary className="mobile-nav-trigger">
                <span className="mobile-nav-trigger-icon">
                  <SwarmHiveIcon />
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
                  idPrefix="mobile"
                  compact
                  showFooter={false}
                />
              </div>
            </details>

            <div className="page-heading">
              {breadcrumbs && breadcrumbs.length > 0 ? (
                <nav className="breadcrumbs" aria-label="页面路径">
                  {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    return (
                      <span key={`${crumb.label}-${index}`} className="breadcrumb-item">
                        {crumb.href && !isLast ? (
                          <Link href={crumb.href} className="breadcrumb-link">
                            {crumb.label}
                          </Link>
                        ) : (
                          <span className={isLast ? "breadcrumb-current" : "breadcrumb-link"}>
                            {crumb.label}
                          </span>
                        )}
                        {!isLast ? (
                          <span className="breadcrumb-separator" aria-hidden="true">
                            /
                          </span>
                        ) : null}
                      </span>
                    );
                  })}
                </nav>
              ) : null}
              <h1 className="page-title">{title}</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <Tooltip content="打开命令面板 (Ctrl/⌘ + K)">
              <button
                type="button"
                className="chrome-toggle-button command-palette-trigger"
                aria-label="打开命令面板"
                onClick={() => {
                  window.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "k", ctrlKey: true, metaKey: true }),
                  );
                }}
              >
                <span aria-hidden="true">⌘K</span>
              </button>
            </Tooltip>
            <ThemeToggle />
            <form action={logoutAction}>
              <button type="submit" className="ghost-button">
                退出登录
              </button>
            </form>
          </div>
        </header>

        <main className="app-content">
          <div className="app-content-inner">
            {description ? <p className="page-lede">{description}</p> : null}
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
