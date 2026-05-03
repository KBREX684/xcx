"use client";

/**
 * Module-scope navigation store.
 *
 * Why: 在 Next.js App Router 中，每次切换路由时 page.tsx 会重新渲染，包裹其中的
 * `<AppShell>` / `<SidebarNavigation>` 也会经历重建。如果状态用 useState 保存，
 * "更多" 折叠组的开合在重建瞬间会闪回默认值（true），等 useEffect 读完
 * localStorage 才纠正——这就是肉眼看到的"闪烁/抖动"。
 *
 * 解决：把折叠态、待跳转 href 抬到模块作用域，配合 `useSyncExternalStore` 订阅。
 * 模块只初始化一次（首次 import 时读 localStorage），后续无论组件重建多少次都
 * 拿到稳定的同一份状态，零闪烁。
 *
 * 同时它也是顶部进度条的事件源：sidebar 在 click 时 `setPending(href)`，
 * `<TopProgress>` 订阅同一 store 显示 1px 进度线。
 */

const SECONDARY_OPEN_KEY = "acp-sidebar-secondary-open";
const SIDEBAR_COLLAPSED_KEY = "acp-sidebar-collapsed";

export type NavSnapshot = {
  secondaryOpen: boolean;
  sidebarCollapsed: boolean;
  pendingHref: string | null;
};

function readBool(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : stored === "true";
  } catch {
    return fallback;
  }
}

function writeBool(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "true" : "false");
  } catch {
    // localStorage 不可用时优雅降级，仅丢失会话间偏好
  }
}

let snapshot: NavSnapshot = {
  secondaryOpen: true,
  sidebarCollapsed: false,
  pendingHref: null,
};
const serverSnapshot: NavSnapshot = {
  secondaryOpen: true,
  sidebarCollapsed: false,
  pendingHref: null,
};

let initialised = false;

function ensureInitialised() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;
  snapshot = {
    secondaryOpen: readBool(SECONDARY_OPEN_KEY, true),
    sidebarCollapsed: readBool(SIDEBAR_COLLAPSED_KEY, false),
    pendingHref: null,
  };
}

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const navStore = {
  getSnapshot(): NavSnapshot {
    ensureInitialised();
    return snapshot;
  },
  // SSR 初始快照：保持与默认 client 默认值一致，规避 hydration mismatch。
  getServerSnapshot(): NavSnapshot {
    return serverSnapshot;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setSecondaryOpen(next: boolean) {
    ensureInitialised();
    if (snapshot.secondaryOpen === next) return;
    snapshot = { ...snapshot, secondaryOpen: next };
    writeBool(SECONDARY_OPEN_KEY, next);
    emit();
  },
  setSidebarCollapsed(next: boolean) {
    ensureInitialised();
    if (snapshot.sidebarCollapsed === next) return;
    snapshot = { ...snapshot, sidebarCollapsed: next };
    writeBool(SIDEBAR_COLLAPSED_KEY, next);
    emit();
  },
  setPendingHref(next: string | null) {
    ensureInitialised();
    if (snapshot.pendingHref === next) return;
    snapshot = { ...snapshot, pendingHref: next };
    emit();
  },
};
