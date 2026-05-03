// 移动端用户偏好（P3-2-01）：通知类别偏好、默认首页、刷新间隔。
//
// 设计约束：
// - 仅本地持久化（AsyncStorage），不写到服务端，不影响 Agent 治理。
// - 每次变更通过 telemetry `mobile_setting_changed` 上报审计事件
//   （key + 摘要值，不上报敏感字段）。
// - 只允许"低风险"维度：通知开关、默认首页、刷新节流。
//   高风险（Agent 启停 / 审批策略 / 团队权限）禁止从移动端写。
import AsyncStorage from "@react-native-async-storage/async-storage";
import { telemetryClient } from "../telemetry/telemetryClient";

const STORAGE_KEY = "acp.mobile.preferences.v1";

export type DefaultHome = "home" | "inbox" | "projects";

export interface MobilePreferences {
  notify: {
    approval: boolean;
    runFailed: boolean;
    evidence: boolean;
    mentions: boolean;
  };
  defaultHome: DefaultHome;
  /** 列表自动刷新间隔（秒）。0 = 关闭。 */
  refreshIntervalSec: 0 | 30 | 60 | 120;
}

export const DEFAULT_PREFERENCES: MobilePreferences = {
  notify: { approval: true, runFailed: true, evidence: true, mentions: true },
  defaultHome: "home",
  refreshIntervalSec: 60,
};

function isDefaultHome(v: unknown): v is DefaultHome {
  return v === "home" || v === "inbox" || v === "projects";
}

function isRefreshInterval(v: unknown): v is MobilePreferences["refreshIntervalSec"] {
  return v === 0 || v === 30 || v === 60 || v === 120;
}

function sanitize(raw: unknown): MobilePreferences {
  if (!raw || typeof raw !== "object") return DEFAULT_PREFERENCES;
  const r = raw as Record<string, unknown>;
  const notifyRaw = (r.notify as Record<string, unknown>) ?? {};
  return {
    notify: {
      approval: typeof notifyRaw.approval === "boolean" ? notifyRaw.approval : DEFAULT_PREFERENCES.notify.approval,
      runFailed: typeof notifyRaw.runFailed === "boolean" ? notifyRaw.runFailed : DEFAULT_PREFERENCES.notify.runFailed,
      evidence: typeof notifyRaw.evidence === "boolean" ? notifyRaw.evidence : DEFAULT_PREFERENCES.notify.evidence,
      mentions: typeof notifyRaw.mentions === "boolean" ? notifyRaw.mentions : DEFAULT_PREFERENCES.notify.mentions,
    },
    defaultHome: isDefaultHome(r.defaultHome) ? r.defaultHome : DEFAULT_PREFERENCES.defaultHome,
    refreshIntervalSec: isRefreshInterval(r.refreshIntervalSec)
      ? r.refreshIntervalSec
      : DEFAULT_PREFERENCES.refreshIntervalSec,
  };
}

export const preferencesStore = {
  async load(): Promise<MobilePreferences> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_PREFERENCES;
      return sanitize(JSON.parse(raw));
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },
  async save(next: MobilePreferences, changedKey?: string): Promise<void> {
    const safe = sanitize(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    void telemetryClient.track("mobile_setting_changed", {
      attrs: changedKey ? { key: changedKey } : {},
    });
  },
};
