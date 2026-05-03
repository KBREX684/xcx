// 移动设备注册 / 推送 token / 版本检查 DTO。后端首版应至少支持 deviceId、platform、
// appVersion、osVersion、push token；不强制 IDFA / OAID 等高敏字段，避免触发额外合规审查。
import { z } from "zod";

export const mobilePlatformSchema = z.enum(["android", "ios"]);
export type MobilePlatform = z.infer<typeof mobilePlatformSchema>;

export const pushChannelSchema = z.enum([
  "none",
  "expo",
  "fcm",
  "huawei",
  "xiaomi",
  "oppo",
  "vivo",
  "meizu",
  "apns",
]);
export type PushChannel = z.infer<typeof pushChannelSchema>;

export const mobileDeviceIdSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[A-Za-z0-9._:-]+$/, "deviceId 仅允许字母数字与 . _ - :");

export const mobileDeviceRegisterInputSchema = z.object({
  deviceId: mobileDeviceIdSchema,
  platform: mobilePlatformSchema,
  appVersion: z.string().max(32),
  appBuild: z.string().max(32).optional(),
  osVersion: z.string().max(32),
  deviceModel: z.string().max(64).optional(),
  manufacturer: z.string().max(64).optional(),
  /** 渠道包标识：yingyongbao / huawei / xiaomi 等。未识别留空。 */
  channel: z.string().max(32).optional(),
  pushChannel: pushChannelSchema.optional(),
  pushToken: z.string().max(512).optional(),
  language: z.string().max(16).optional(),
  /** 是否同意隐私政策；后端必须校验 = true 才落库。 */
  privacyConsent: z.literal(true),
  /** 同意时间，ISO 字符串。 */
  privacyConsentAt: z.string().datetime(),
  /** 隐私政策版本号，例如 `2026-04-26`，用于审计追踪。 */
  privacyVersion: z.string().min(1).max(32),
});
export type MobileDeviceRegisterInput = z.infer<typeof mobileDeviceRegisterInputSchema>;

export const mobileDeviceSchema = z.object({
  deviceId: mobileDeviceIdSchema,
  memberId: z.string(),
  platform: mobilePlatformSchema,
  appVersion: z.string(),
  channel: z.string().nullable(),
  registeredAt: z.string(),
  lastActiveAt: z.string(),
});
export type MobileDevice = z.infer<typeof mobileDeviceSchema>;

export const mobilePushTokenUpdateInputSchema = z.object({
  pushChannel: pushChannelSchema,
  pushToken: z.string().min(1).max(512).nullable(),
});
export type MobilePushTokenUpdateInput = z.infer<typeof mobilePushTokenUpdateInputSchema>;

/** 版本检查：后端推断最低版本与建议版本，移动端在冷启动后调用。 */
export const mobileReleaseInfoSchema = z.object({
  /** 当前可用最新版本号（语义化版本）。 */
  latest: z.string(),
  /** 强制最低版本，低于该版本必须升级。 */
  minimum: z.string(),
  /** 升级文案与下载/跳转链接（应用宝商店地址或公司官网）。 */
  releaseNotes: z.string().max(2000),
  upgradeUrl: z.string().url(),
  /** 是否为非阻塞提示：true 表示软更新，仅一次性弹窗。 */
  optional: z.boolean(),
  publishedAt: z.string(),
});
export type MobileReleaseInfo = z.infer<typeof mobileReleaseInfoSchema>;
