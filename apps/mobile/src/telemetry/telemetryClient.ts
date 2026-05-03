// 遥测客户端：在 enqueue 时执行 sanitizer，过滤密钥/令牌/邮箱/手机号/身份证号等。
// 缓冲队列在内存里，每 5s 或每 20 条 flush 一次。失败缓冲到 AsyncStorage（容量 1000）。
//
// 重要：永远不要把 telemetry 升级为强一致写入。它是"尽力而为"通道，断网即丢。

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  mobileTelemetryEventSchema,
  type MobileTelemetryEvent,
  type MobileTelemetryEventName,
} from "@agent-control-plane/domain/src/mobile";
import { Platform } from "react-native";
import { env } from "../config/env";
import { apiClient } from "../services/apiClient";
import { getStableDeviceId } from "../storage/deviceIdStore";

const FLUSH_INTERVAL_MS = 5000;
const FLUSH_BATCH = 20;
const STORAGE_KEY = "acp.telemetry.queue.v1";

let buffer: MobileTelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let cachedDeviceId: string | null = null;
let consentEnabled = false;

const FORBIDDEN_KEY_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /pwd/i,
  /authorization/i,
  /api[-_]?key/i,
  /access[-_]?key/i,
  /refresh/i,
  /private[-_]?key/i,
];

const SENSITIVE_VALUE_PATTERNS = [
  /\d{17}[\dXx]/, // 身份证
  /\b1[3-9]\d{9}\b/, // 手机号
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // 邮箱
];

function sanitizeAttrs(attrs: Record<string, unknown> | undefined) {
  if (!attrs) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  let count = 0;
  for (const [k, v] of Object.entries(attrs)) {
    if (count >= 8) break;
    if (FORBIDDEN_KEY_PATTERNS.some((re) => re.test(k))) continue;
    if (typeof v === "string") {
      if (SENSITIVE_VALUE_PATTERNS.some((re) => re.test(v))) continue;
      out[k] = v.length > 128 ? v.slice(0, 128) : v;
    } else if (typeof v === "number" || typeof v === "boolean" || v === null) {
      out[k] = v;
    } else {
      // 对象 / 数组 / undefined 一律丢弃
      continue;
    }
    count += 1;
  }
  return out;
}

async function ensureDeviceId(): Promise<string> {
  if (!cachedDeviceId) cachedDeviceId = await getStableDeviceId();
  return cachedDeviceId;
}

async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(buffer.slice(-1000)));
  } catch {
    // 持久化失败不阻塞业务
  }
}

async function loadPersisted() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as MobileTelemetryEvent[];
    if (Array.isArray(parsed)) buffer = parsed;
  } catch {
    // ignore
  }
}

async function flush() {
  if (buffer.length === 0) return;
  const batch = buffer.splice(0, FLUSH_BATCH);
  const result = await apiClient.request({
    path: "/api/v1/mobile/telemetry",
    method: "POST",
    body: { events: batch },
    anonymous: true, // telemetry 通道允许匿名（启动期可能尚未登录）
  });
  if (!result.ok) {
    // 失败：把这一批塞回去（前置），避免无限失败循环则丢弃旧的
    buffer = [...batch, ...buffer].slice(-1000);
  }
  await persist();
}

export const telemetryClient = {
  setConsentEnabled(enabled: boolean) {
    consentEnabled = enabled;
    if (!enabled) {
      buffer = [];
      cachedDeviceId = null;
    }
  },
  async start() {
    if (!consentEnabled) return;
    await loadPersisted();
    if (flushTimer) clearInterval(flushTimer);
    flushTimer = setInterval(() => {
      void flush();
    }, FLUSH_INTERVAL_MS);
  },
  async stop() {
    if (flushTimer) clearInterval(flushTimer);
    flushTimer = null;
    if (consentEnabled) await flush();
  },
  async track(
    name: MobileTelemetryEventName,
    options: {
      level?: "debug" | "info" | "warn" | "error" | "fatal";
      outcome?: "success" | "error";
      route?: string;
      durationMs?: number;
      traceId?: string;
      attrs?: Record<string, unknown>;
    } = {},
  ) {
    if (!consentEnabled) return;
    const evt: MobileTelemetryEvent = mobileTelemetryEventSchema.parse({
      source: "mobile",
      appVersion: env.appVersion,
      platform: Platform.OS === "ios" ? "ios" : "android",
      deviceId: await ensureDeviceId(),
      name,
      level: options.level ?? "info",
      outcome: options.outcome ?? "success",
      route: options.route,
      durationMs: options.durationMs,
      traceId: options.traceId,
      attrs: sanitizeAttrs(options.attrs),
      occurredAt: new Date().toISOString(),
    });
    buffer.push(evt);
    if (buffer.length >= FLUSH_BATCH) {
      void flush();
    } else {
      void persist();
    }
  },
};
