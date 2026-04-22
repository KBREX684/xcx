import Link from "next/link";
import type { ReactNode } from "react";
import { SidebarNavigation } from "./sidebar-navigation";
import { ThemeToggle } from "./theme-toggle";
import { UserIcon } from "./icons";

export type AppNavKey =
  | "dashboard"
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
  actions?: ReactNode;
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
  actions,
  navBadges,
  profileName = "KBREX",
  profileEmail = "kbrex@example.com",
  workspaceName = "KBREX Studio",
  children
}: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
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
            {actions}
            <ThemeToggle />
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
