// 移动端遥测：冷启动、关键路径、崩溃。Telemetry 不允许携带 token、密码、证书私钥、
// 完整用户输入正文。前端 telemetryClient 必须对每个事件做字段白名单过滤后才能上报。
import { z } from "zod";

export const MOBILE_TELEMETRY_EVENTS = [
  "app_cold_start",
  "app_first_screen",
  "login_success",
  "login_failure",
  "approval_decided",
  "approval_failed",
  "certificate_verified",
  "certificate_verify_failed",
  "scan_succeeded",
  "scan_failed",
  "consent_granted",
  "consent_revoked",
  "permission_granted",
  "permission_denied",
  "network_offline",
  "force_upgrade_shown",
  "mobile_setting_changed",
  "cache_observation",
] as const;
export type MobileTelemetryEventName = (typeof MOBILE_TELEMETRY_EVENTS)[number];

export const mobileTelemetryLevelSchema = z.enum(["debug", "info", "warn", "error", "fatal"]);

export const mobileTelemetryEventSchema = z.object({
  source: z.literal("mobile"),
  appVersion: z.string().max(32),
  platform: z.enum(["android", "ios"]),
  deviceId: z.string().max(64).optional(),
  name: z.enum(MOBILE_TELEMETRY_EVENTS),
  level: mobileTelemetryLevelSchema.default("info"),
  outcome: z.enum(["success", "error"]).default("success"),
  /** 路由名而非完整 URL；服务端日志仅作为关键路径分布的维度。 */
  route: z.string().max(128).optional(),
  /** 持续时长，毫秒。 */
  durationMs: z.number().int().nonnegative().max(600_000).optional(),
  /** traceId 允许携带；其它字段必须落入白名单字典。 */
  traceId: z.string().max(64).optional(),
  /** 自由维度白名单，键最长 32，值仅允许 string/number/bool/null。最多 8 个键。 */
  attrs: z
    .record(
      z.string().max(32),
      z.union([z.string().max(128), z.number(), z.boolean(), z.null()]),
    )
    .refine((obj) => Object.keys(obj).length <= 8, "attrs fields too many")
    .optional(),
  occurredAt: z.string().datetime(),
});
export type MobileTelemetryEvent = z.infer<typeof mobileTelemetryEventSchema>;

export const mobileCrashReportSchema = z.object({
  source: z.literal("mobile"),
  appVersion: z.string().max(32),
  platform: z.enum(["android", "ios"]),
  deviceId: z.string().max(64).optional(),
  level: z.enum(["fatal", "error"]).default("error"),
  message: z.string().max(512),
  /** 截断后的堆栈，4KB 上限。 */
  stack: z.string().max(4096).optional(),
  route: z.string().max(128).optional(),
  traceId: z.string().max(64).optional(),
  occurredAt: z.string().datetime(),
});
export type MobileCrashReport = z.infer<typeof mobileCrashReportSchema>;
