// HTTP 客户端：归一化错误码、自动注入 Bearer、串行化的 refresh 队列、超时与离线短路。
//
// 设计要点：
// - 每个请求附带 `clientRequestId` 头，与服务端 IdempotencyLedger 对齐。
// - 401 触发 refresh：同一时刻只允许一个 refresh in-flight，其它请求在内存队列等待。
// - 401 + refresh 失败：清空 session 并触发 onSessionInvalid 回调，调用方导航到登录页。
// - 不在这里展示 toast：只返回 MobileApiResult，UI 层决定如何呈现。
//
// 安全：禁止把响应体打印到控制台；只打印路径 + 状态码 + traceId。

import {
  type MobileApiError,
  type MobileApiResult,
  mapHttpStatusToErrorCode,
  createMobileClientRequestId,
} from "@agent-control-plane/domain/src/mobile";
import { z } from "zod";
import { env } from "../config/env";
import { clearSession, readSession, writeSession, type PersistedSession } from "../storage/secureTokenStore";

const DEFAULT_TIMEOUT_MS = 15_000;

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions<TResponse> {
  path: string;
  method?: ApiMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** 校验响应。强烈建议传入 schema；未传则透传 unknown。 */
  schema?: z.ZodType<TResponse>;
  /** 是否允许匿名访问（如登录、隐私政策）。 */
  anonymous?: boolean;
  /** 自定义幂等 key 前缀，例如 approval / certificate。 */
  idempotencyPrefix?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

let invalidSessionListener: (() => void) | null = null;
export function onSessionInvalid(listener: () => void) {
  invalidSessionListener = listener;
}

let refreshInFlight: Promise<PersistedSession | null> | null = null;

async function refreshTokens(): Promise<PersistedSession | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const current = await readSession();
      if (!current) return null;
      const res = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as Partial<PersistedSession>;
      if (
        typeof json.accessToken !== "string" ||
        typeof json.refreshToken !== "string" ||
        typeof json.memberId !== "string" ||
        typeof json.role !== "string" ||
        typeof json.name !== "string"
      ) {
        return null;
      }
      const next: PersistedSession = {
        accessToken: json.accessToken,
        refreshToken: json.refreshToken,
        memberId: json.memberId,
        role: json.role,
        name: json.name,
      };
      await writeSession(next);
      return next;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function buildUrl(path: string, query?: ApiRequestOptions<unknown>["query"]): string {
  const url = new URL(path.startsWith("http") ? path : `${env.apiBaseUrl}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function performRequest<T>(
  opts: ApiRequestOptions<T>,
  attempt: number,
): Promise<MobileApiResult<T>> {
  const method = opts.method ?? "GET";
  const idempotencyKey = createMobileClientRequestId(opts.idempotencyPrefix ?? "mb");
  const headers: Record<string, string> = {
    accept: "application/json",
    "x-app-platform": "android",
    "x-app-version": env.appVersion,
    "x-app-channel": env.channel,
    "x-client-request-id": idempotencyKey,
  };
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (!opts.anonymous) {
    const session = await readSession();
    if (!session) {
      return { ok: false, error: errorOf(401, "未登录", undefined) };
    }
    headers.authorization = `Bearer ${session.accessToken}`;
  }

  const ctl = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  if (opts.signal) {
    if (opts.signal.aborted) ctl.abort();
    else opts.signal.addEventListener("abort", () => ctl.abort(), { once: true });
  }

  try {
    const res = await fetch(buildUrl(opts.path, opts.query), {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: ctl.signal,
    });
    const traceId = res.headers.get("x-trace-id") ?? undefined;

    if (res.status === 401 && !opts.anonymous && attempt === 0) {
      const refreshed = await refreshTokens();
      if (!refreshed) {
        await clearSession();
        invalidSessionListener?.();
        return { ok: false, error: errorOf(401, "登录已过期", traceId) };
      }
      return performRequest(opts, attempt + 1);
    }

    if (!res.ok) {
      const message = await safeReadMessage(res);
      return { ok: false, error: errorOf(res.status, message, traceId) };
    }

    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!opts.schema) return { ok: true, data: json as T };
    const parsed = opts.schema.safeParse(unwrapEnvelope(json));
    if (!parsed.success) {
      return {
        ok: false,
        error: { code: "VALIDATION", status: res.status, message: parsed.error.message, traceId },
      };
    }
    return { ok: true, data: parsed.data };
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") {
      return { ok: false, error: { code: "NETWORK_TIMEOUT", status: 0, message: "请求超时" } };
    }
    return { ok: false, error: { code: "NETWORK_OFFLINE", status: 0, message: "网络不可用" } };
  } finally {
    clearTimeout(t);
  }
}

function unwrapEnvelope(json: unknown): unknown {
  if (
    json !== null &&
    typeof json === "object" &&
    "data" in (json as Record<string, unknown>) &&
    !Array.isArray(json)
  ) {
    return (json as { data: unknown }).data;
  }
  return json;
}

async function safeReadMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return res.statusText || `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(text) as { message?: unknown; error?: unknown };
      if (typeof parsed.message === "string") return parsed.message;
      if (typeof parsed.error === "string") return parsed.error;
    } catch {
      // not json
    }
    return text.length > 200 ? `${text.slice(0, 200)}…` : text;
  } catch {
    return `HTTP ${res.status}`;
  }
}

function errorOf(status: number, message: string, traceId?: string): MobileApiError {
  return { code: mapHttpStatusToErrorCode(status), status, message, traceId };
}

export const apiClient = {
  request<T>(opts: ApiRequestOptions<T>): Promise<MobileApiResult<T>> {
    return performRequest(opts, 0);
  },
};
