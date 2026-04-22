import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";

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

const navItems: Array<{ key: AppNavKey; label: string; href: string; caption: string }> = [
  { key: "dashboard", label: "工作台", href: "/", caption: "总览与快捷入口" },
  { key: "projects", label: "项目", href: "/projects", caption: "项目与任务" },
  { key: "approvals", label: "审批", href: "/approvals", caption: "待办与历史" },
  { key: "agents", label: "执行代理", href: "/agents", caption: "执行角色与状态" },
  { key: "workflows", label: "流程模板", href: "/workflows", caption: "模板与节点结构" },
  { key: "certificates", label: "证明书", href: "/certificates", caption: "过程留痕与摘要" },
  { key: "settings", label: "接入配置", href: "/settings/integrations", caption: "执行与回调设置" }
];

type AppShellProps = {
  activeNav: AppNavKey;
  title: string;
  description: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  children: ReactNode;
};

function NavigationLinks({ activeNav }: { activeNav: AppNavKey }) {
  return (
    <nav className="app-nav" aria-label="主导航">
      {navItems.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className="app-nav-link"
          data-active={item.key === activeNav ? "true" : "false"}
        >
          <span className="app-nav-label">{item.label}</span>
          <span className="app-nav-caption">{item.caption}</span>
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ activeNav, title, description, breadcrumbs = [], actions, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-block">
          <div className="brand-kicker">智能代理指挥台</div>
          <div className="brand-title">零号工作室</div>
          <p className="brand-copy">面向交付闭环的全中文控制台，支持项目、审批、流程模板与证明书管理。</p>
        </div>
        <NavigationLinks activeNav={activeNav} />
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="page-title-group">
            <details className="mobile-nav">
              <summary className="mobile-nav-trigger">打开菜单</summary>
              <div className="mobile-nav-panel">
                <NavigationLinks activeNav={activeNav} />
              </div>
            </details>

            <nav className="breadcrumbs" aria-label="面包屑">
              {breadcrumbs.length === 0 ? (
                <span className="breadcrumb-current">控制台</span>
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

            <div>
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
