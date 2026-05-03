"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type ComponentType,
  type MouseEvent,
  useEffect,
  useSyncExternalStore,
  useTransition,
} from "react";
import { navStore } from "./nav-store";
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
  WorkflowIcon,
} from "./icons";

type NavBadgeMap = Partial<Record<AppNavKey, number>>;

type SidebarNavigationProps = {
  activeNav: AppNavKey;
  navBadges?: NavBadgeMap;
  profileName: string;
  profileEmail: string;
  workspaceName?: string;
  idPrefix?: string;
  showFooter?: boolean;
  compact?: boolean;
};

type SidebarItem = {
  key: AppNavKey;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const primaryItems: SidebarItem[] = [
  { key: "messages", label: "收件箱", href: "/messages", icon: MessageIcon },
  { key: "issues", label: "事项", href: "/issues", icon: HomeIcon },
  { key: "projects", label: "项目", href: "/projects", icon: FolderIcon },
  { key: "team", label: "团队", href: "/team", icon: UsersIcon },
  { key: "agents", label: "智能体", href: "/agents", icon: BotIcon },
  { key: "approvals", label: "审批", href: "/approvals", icon: BellIcon },
  { key: "certificates", label: "证明书", href: "/certificates", icon: ShieldIcon },
];

const secondaryItems: SidebarItem[] = [
  { key: "workflows", label: "流程模板", href: "/workflows", icon: WorkflowIcon },
  { key: "settings", label: "接入配置", href: "/settings/integrations", icon: SettingsIcon },
];

function isSecondaryActive(activeNav: AppNavKey) {
  return activeNav === "workflows" || activeNav === "settings";
}

export function SidebarNavigation({
  activeNav,
  navBadges,
  profileName,
  profileEmail,
  workspaceName = "工作区",
  idPrefix = "sidebar",
  showFooter = true,
  compact = false,
}: SidebarNavigationProps) {
  const secondaryNavId =
    idPrefix === "desktop" ? "sidebar-subnav-secondary" : `${idPrefix}-sidebar-subnav-secondary`;
  const pathname = usePathname();
  const router = useRouter();
  const snapshot = useSyncExternalStore(
    navStore.subscribe,
    navStore.getSnapshot,
    navStore.getServerSnapshot,
  );
  // 当前导航命中二级组时强制保持展开；否则尊重用户偏好。
  // —— 此判断只读不写，避免反复 setState 触发的闪烁。
  const secondaryOpen = isSecondaryActive(activeNav) ? true : snapshot.secondaryOpen;
  const pendingHref = snapshot.pendingHref;
  const [, startNavigation] = useTransition();

  useEffect(() => {
    for (const item of [...primaryItems, ...secondaryItems]) {
      router.prefetch(item.href);
    }
  }, [router]);

  // 路由切换完成 → 清掉 pending 高亮 / 顶部进度。
  useEffect(() => {
    navStore.setPendingHref(null);
  }, [pathname]);

  function toggleSecondary() {
    navStore.setSecondaryOpen(!snapshot.secondaryOpen);
  }

  function isCurrentHref(href: string) {
    return pathname === href;
  }

  function handleNavIntent(href: string) {
    router.prefetch(href);
  }

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      isCurrentHref(href)
    ) {
      return;
    }

    event.preventDefault();
    navStore.setPendingHref(href);
    startNavigation(() => {
      router.push(href);
    });
  }

  return (
    <div
      className={compact ? "sidebar-navigation sidebar-navigation-compact" : "sidebar-navigation"}
    >
      <details className="profile-menu">
        <summary className="profile-menu-trigger">
          <span className="profile-avatar">{profileName.slice(0, 1).toUpperCase()}</span>
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
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const hasMessageBadge =
            item.key === "messages" &&
            typeof navBadges?.messages === "number" &&
            navBadges.messages > 0;
          const isPending = pendingHref === item.href;

          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch
              className="sidebar-direct-link"
              data-active={activeNav === item.key ? "true" : "false"}
              data-pending={isPending ? "true" : "false"}
              aria-current={activeNav === item.key ? "page" : undefined}
              aria-busy={isPending ? "true" : undefined}
              onClick={(event) => handleNavClick(event, item.href)}
              onFocus={() => handleNavIntent(item.href)}
              onMouseEnter={() => handleNavIntent(item.href)}
            >
              <span className="sidebar-parent-link sidebar-parent-link-static">
                <span className="sidebar-group-icon">
                  <Icon />
                </span>
                <span className="sidebar-parent-copy">{item.label}</span>
              </span>
              {hasMessageBadge ? (
                <span className="sidebar-badge">
                  {navBadges.messages && navBadges.messages > 99 ? "99+" : navBadges.messages}
                </span>
              ) : null}
            </Link>
          );
        })}

        <section
          className="sidebar-group sidebar-group-secondary"
          data-open={secondaryOpen ? "true" : "false"}
          aria-labelledby={`${secondaryNavId}-label`}
        >
          <div className="sidebar-parent-row">
            <button
              type="button"
              className="sidebar-parent-toggle"
              data-open={secondaryOpen ? "true" : "false"}
              data-active={isSecondaryActive(activeNav) ? "true" : "false"}
              aria-expanded={secondaryOpen}
              aria-controls={secondaryNavId}
              aria-label={secondaryOpen ? "收起更多" : "展开更多"}
              onClick={toggleSecondary}
            >
              <span id={`${secondaryNavId}-label`} className="sidebar-parent-toggle-main">
                <span className="sidebar-section-label sidebar-section-label-inline">更多</span>
              </span>
              <ChevronDownIcon className="sidebar-group-chevron" />
            </button>
          </div>
          <div
            id={secondaryNavId}
            className="sidebar-subnav"
            aria-label="更多导航"
            data-open={secondaryOpen ? "true" : "false"}
            aria-hidden={secondaryOpen ? undefined : "true"}
            {...(secondaryOpen ? {} : { inert: true })}
          >
            {secondaryItems.map((item) => {
              const Icon = item.icon;
              const isPending = pendingHref === item.href;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  prefetch
                  className="sidebar-subnav-link"
                  data-active={activeNav === item.key ? "true" : "false"}
                  data-pending={isPending ? "true" : "false"}
                  aria-current={activeNav === item.key ? "page" : undefined}
                  aria-busy={isPending ? "true" : undefined}
                  onClick={(event) => handleNavClick(event, item.href)}
                  onFocus={() => handleNavIntent(item.href)}
                  onMouseEnter={() => handleNavIntent(item.href)}
                >
                  <span className="sidebar-subnav-icon">
                    <Icon />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </nav>

      {showFooter ? (
        <div className="sidebar-footer">
          <span className="sidebar-footer-mark">蜂聚合 · SwarmHive</span>
        </div>
      ) : null}
    </div>
  );
}
