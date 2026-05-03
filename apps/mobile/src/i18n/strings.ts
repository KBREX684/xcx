// 轻量 i18n（DEBT-05）
//
// 设计目标：
// - 集中化高频文案，便于审计、批量替换、未来接 iOS 上架时切英文。
// - **不**引入 i18next：移动端目前仅 zh-CN，过度抽象会拖慢冷启动并增加包体。
// - `t(key)` 缺 key 时返回 key 本身（dev 期可视化）+ 控制台 warn；release 期 warn 被构建剥离。
// - 占位符替换：`t("foo.bar", { name: "x" })` 替换 `{name}`；防注入仅替换字面字符串。
//
// 迁移路径：新增文案先入库再使用；旧硬编码逐步替换，不强求一次性完成。

export type Locale = "zh-CN" | "en-US";

export const ZH_CN: Record<string, string> = {
  // 通用
  "common.retry": "重试",
  "common.refresh": "刷新",
  "common.confirm": "确认",
  "common.cancel": "取消",
  "common.save": "保存",
  "common.saved": "已保存",
  "common.loading": "加载中…",
  "common.networkError": "网络不可用",
  "common.unknownError": "未知错误",

  // 首页
  "home.title": "今日控制面",
  "home.loading": "加载首页…",
  "home.loadFailed": "加载失败",
  "home.checkNetwork": "请检查网络后重试",

  // 审批
  "approval.approve": "通过",
  "approval.reject": "驳回",
  "approval.evidenceFailed": "证据失败需 Web 复核",
  "approval.decided": "已处理",

  // 证书
  "certificate.scan": "扫码核验",
  "certificate.manualInput": "手动输入证书号",
  "certificate.permissionDenied": "未授权相机，已切换到手动输入",

  // 设置
  "settings.preferences": "偏好设置",
  "settings.notifications": "通知类别",
  "settings.defaultHome": "默认首页",
  "settings.refreshInterval": "列表刷新",
  "settings.restoreDefaults": "恢复默认设置",

  // 缓存与离线
  "cache.staleHint": "只读缓存，请下拉刷新",

  // 安全
  "security.sessionExpired": "登录已过期",
  "security.requestTimeout": "请求超时",
};

const DICTS: Record<Locale, Record<string, string>> = {
  "zh-CN": ZH_CN,
  // 占位：英文文案在 iOS Spike 启动时由产品+法务共同提供
  "en-US": {},
};

let currentLocale: Locale = "zh-CN";

export function setLocale(next: Locale) {
  currentLocale = next;
}

export function getLocale(): Locale {
  return currentLocale;
}

const PLACEHOLDER = /\{(\w+)\}/g;

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = DICTS[currentLocale];
  const fallback = DICTS["zh-CN"];
  const raw = dict[key] ?? fallback[key];
  if (raw === null || raw === undefined) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn(`[i18n] missing key: ${key}`);
    }
    return key;
  }
  if (!params) return raw;
  return raw.replace(PLACEHOLDER, (_, name: string) => {
    const v = params[name];
    return v === null || v === undefined ? `{${name}}` : String(v);
  });
}

declare const __DEV__: boolean | undefined;
