// 移动端通用类型 / 错误码 / 幂等工具：复用 miniapp 的 clientRequestId 工具，再加移动端
// 专属的统一响应包络与错误码枚举。后端可以同时使用裸响应或包络响应，移动端 apiClient
// 必须把两者都归一为 `MobileApiResult<T>`。
import { z } from "zod";
import {
  miniappClientRequestIdSchema,
  miniappClientRequestInputSchema,
  createMiniappClientRequestId,
} from "../miniapp/common";

export const mobileClientRequestIdSchema = miniappClientRequestIdSchema;
export const mobileClientRequestInputSchema = miniappClientRequestInputSchema;

/**
 * 创建移动端幂等键。前缀语义：approval/workflow/certificate/device/login。
 * 与小程序共用同一字符集，便于后端 IdempotencyLedger 统一去重。
 */
export function createMobileClientRequestId(prefix = "mb"): string {
  return createMiniappClientRequestId(prefix);
}

/**
 * 移动端在边界层归一化错误。所有未识别的错误都映射到 UNKNOWN，但保留原始 status 与
 * 服务端 message 以便上报。前端文案由 i18n 表读取，禁止把后端 message 直接弹给用户。
 */
export const MOBILE_ERROR_CODES = [
  "NETWORK_OFFLINE",
  "NETWORK_TIMEOUT",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION",
  "CONFLICT",
  "RATE_LIMITED",
  "SERVER",
  "MAINTENANCE",
  "UNKNOWN",
] as const;
export type MobileErrorCode = (typeof MOBILE_ERROR_CODES)[number];

export interface MobileApiError {
  code: MobileErrorCode;
  status: number;
  message: string;
  /** 服务端 traceId，便于客服联动。允许上报到 telemetry。 */
  traceId?: string;
  /** 服务端原始 errorCode（如存在），保留给开发调试，不展示给用户。 */
  rawCode?: string;
}

export type MobileApiResult<T> = { ok: true; data: T } | { ok: false; error: MobileApiError };

export function mapHttpStatusToErrorCode(status: number): MobileErrorCode {
  if (status === 0) return "NETWORK_OFFLINE";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 422) return "VALIDATION";
  if (status === 429) return "RATE_LIMITED";
  if (status === 503) return "MAINTENANCE";
  if (status >= 500) return "SERVER";
  return "UNKNOWN";
}

/** 服务端可选包络。允许 `{ data, traceId }` 或裸 data，移动端均接受。 */
export const mobileEnvelopeSchema = <T extends z.ZodTypeAny>(payload: T) =>
  z.union([
    payload,
    z.object({
      data: payload,
      traceId: z.string().optional(),
    }),
  ]);

export function unwrapEnvelope<T>(value: unknown, schema: z.ZodType<T>): T {
  // 优先尝试包络
  if (
    typeof value === "object" &&
    value !== null &&
    "data" in (value as Record<string, unknown>) &&
    !("ok" in (value as Record<string, unknown>))
  ) {
    const inner = (value as { data: unknown }).data;
    return schema.parse(inner);
  }
  return schema.parse(value);
}
