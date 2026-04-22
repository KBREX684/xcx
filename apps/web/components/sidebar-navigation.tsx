"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AppNavKey } from "./app-shell";
import {
  BellIcon,
  BotIcon,
  ChevronDownIcon,
  FolderIcon,
  HomeIcon,
  MessageIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
  WorkflowIcon
} from "./icons";

type NavBadgeMap = Partial<Record<AppNavKey, number>>;

type SidebarNavigationProps = {
  activeNav: AppNavKey;
  navBadges?: NavBadgeMap;
  profileName: string;
  profileEmail: string;
  workspaceName?: string;
  showFooter?: boolean;
  compact?: boolean;
};

const workbenchItems: Array<{ key: AppNavKey; label: string; href: string; icon: typeof FolderIcon }> = [
  { key: "projects", label: "项目", href: "/projects", icon: FolderIcon },
  { key: "workflows", label: "工作流", href: "/workflows", icon: WorkflowIcon },
  { key: "certificates", label: "证书", href: "/certificates", icon: ShieldIcon }
];

const teamItems: Array<{ key: AppNavKey; label: string; href: string; icon: typeof BotIcon }> = [
  { key: "agents", label: "智能体", href: "/agents", icon: BotIcon },
  { key: "settings", label: "配置", href: "/settings/integrations", icon: SettingsIcon }
];

function isWorkbenchActive(activeNav: AppNavKey) {
  return activeNav === "dashboard" || activeNav === "projects" || activeNav === "workflows" || activeNav === "certificates";
}

function isTeamActive(activeNav: AppNavKey) {
  return activeNav === "team" || activeNav === "agents" || activeNav === "settings";
}

export function SidebarNavigation({
  activeNav,
  navBadges,
  profileName,
  profileEmail,
  workspaceName = "KBREX Studio",
  showFooter = true,
  compact = false
}: SidebarNavigationProps) {
  const [workbenchOpen, setWorkbenchOpen] = useState(() => isWorkbenchActive(activeNav));
  const [teamOpen, setTeamOpen] = useState(() => isTeamActive(activeNav));

  useEffect(() => {
    if (isWorkbenchActive(activeNav)) {
      setWorkbenchOpen(true);
    }

    if (isTeamActive(activeNav)) {
      setTeamOpen(true);
    }
  }, [activeNav]);

  return (
    <div className={compact ? "sidebar-navigation sidebar-navigation-compact" : "sidebar-navigation"}>
      <details className="profile-menu">
        <summary className="profile-menu-trigger">
          <span className="profile-avatar">{profileName.slice(0, 1)}</span>
          <span className="profile-copy">
            <strong>{profileName}</strong>
            <span>{workspaceName}</span>
          </span>
          <ChevronDownIcon className="profile-menu-chevron" />
        </summary>

        <div className="profile-menu-popover">
          <div className="profile-menu-caption">{profileEmail}</div>
          <Link href="/profile" className="profile-menu-item">
            <UserIcon />
            <span>查看个人资料</span>
          </Link>
          <Link href="/settings/integrations" className="profile-menu-item">
            <SettingsIcon />
            <span>设置</span>
          </Link>
        </div>
      </details>

      <nav className="sidebar-primary-nav" aria-label="主导航">
        <section className="sidebar-group" data-open={workbenchOpen ? "true" : "false"}>
          <div className="sidebar-group-header" data-active={isWorkbenchActive(activeNav) ? "true" : "false"}>
            <Link href="/" className="sidebar-group-main">
              <span className="sidebar-group-icon">
                <HomeIcon />
              </span>
              <span>工作台</span>
            </Link>
            <button
              type="button"
              className="sidebar-group-toggle"
              aria-label={workbenchOpen ? "收起工作台导航" : "展开工作台导航"}
              aria-expanded={workbenchOpen}
              onClick={() => setWorkbenchOpen((current) => !current)}
            >
              <ChevronDownIcon className="sidebar-group-chevron" />
            </button>
          </div>

          {workbenchOpen ? (
            <div className="sidebar-subnav">
              {workbenchItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="sidebar-subnav-link"
                    data-active={activeNav === item.key ? "true" : "false"}
                  >
                    <span className="sidebar-subnav-icon">
                      <Icon />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="sidebar-group" data-open={teamOpen ? "true" : "false"}>
          <div className="sidebar-group-header" data-active={isTeamActive(activeNav) ? "true" : "false"}>
            <Link href="/team" className="sidebar-group-main">
              <span className="sidebar-group-icon">
                <UsersIcon />
              </span>
              <span>团队</span>
            </Link>
            <button
              type="button"
              className="sidebar-group-toggle"
              aria-label={teamOpen ? "收起团队导航" : "展开团队导航"}
              aria-expanded={teamOpen}
              onClick={() => setTeamOpen((current) => !current)}
            >
              <ChevronDownIcon className="sidebar-group-chevron" />
            </button>
          </div>

          {teamOpen ? (
            <div className="sidebar-subnav">
              {teamItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="sidebar-subnav-link"
                    data-active={activeNav === item.key ? "true" : "false"}
                  >
                    <span className="sidebar-subnav-icon">
                      <Icon />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </section>

        <Link href="/messages" className="sidebar-direct-link" data-active={activeNav === "messages" ? "true" : "false"}>
          <span className="sidebar-group-main">
            <span className="sidebar-group-icon">
              <MessageIcon />
            </span>
            <span>消息</span>
          </span>
          {typeof navBadges?.messages === "number" && navBadges.messages > 0 ? (
            <span className="sidebar-badge">{navBadges.messages > 99 ? "99+" : navBadges.messages}</span>
          ) : (
            <span className="sidebar-direct-icon">
              <BellIcon />
            </span>
          )}
        </Link>
      </nav>

      {showFooter ? (
        <div className="sidebar-footer">
          <span className="sidebar-footer-mark">XCX</span>
          <span className="sidebar-footer-version">Agent Delivery OS</span>
        </div>
      ) : null}
    </div>
  );
}
