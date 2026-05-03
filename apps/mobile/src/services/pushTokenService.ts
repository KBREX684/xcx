// 推送 token 管理：仅在用户在设置中开启「通知」开关后才申请权限并获取 token。
// 设计要点：
// - 使用 expo-notifications.getExpoPushTokenAsync 获取 Expo Push token。
//   未来切换到 HMS/MiPush 时由 channel 决定 pushChannel 字段，token 字符串本身由各 SDK 决定。
// - 调用时机：登录后用户在 SettingsScreen 显式开启；不允许冷启动期主动初始化 push SDK。
// - 失败容错：拿不到权限或 token 时静默记录 telemetry，不阻断主路径。

import * as Notifications from "expo-notifications";
import { deviceService } from "./deviceService";
import { getStableDeviceId } from "../storage/deviceIdStore";
import { env } from "../config/env";
import { telemetryClient } from "../telemetry/telemetryClient";
import type { PushChannel } from "@agent-control-plane/domain/src/mobile";

export interface PushRegistrationResult {
  ok: boolean;
  reason?: "denied" | "token_unavailable" | "network_error";
  pushChannel: PushChannel;
}

const PUSH_CHANNEL = (channel: string): PushChannel => {
  switch (channel) {
    case "huawei":
      return "huawei";
    case "xiaomi":
      return "xiaomi";
    case "oppo":
      return "oppo";
    case "vivo":
      return "vivo";
    default:
      return "expo";
  }
};

export const pushTokenService = {
  async enable(): Promise<PushRegistrationResult> {
    const pushChannel = PUSH_CHANNEL(env.channel);

    const settings = await Notifications.getPermissionsAsync();
    let status = settings.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") {
      void telemetryClient.track("permission_denied", {
        attrs: { kind: "notifications" },
        outcome: "error",
      });
      return { ok: false, reason: "denied", pushChannel };
    }

    let tokenValue: string | null = null;
    try {
      // P0 主渠道为应用宝（Expo Push）；P1 多渠道阶段会按 channel 切换 SDK
      const result = await Notifications.getExpoPushTokenAsync();
      tokenValue = result?.data ?? null;
    } catch {
      tokenValue = null;
    }
    if (!tokenValue) {
      return { ok: false, reason: "token_unavailable", pushChannel };
    }

    const deviceId = await getStableDeviceId();
    const res = await deviceService.updatePushToken(deviceId, {
      pushChannel,
      pushToken: tokenValue,
    });
    if (!res.ok) {
      return { ok: false, reason: "network_error", pushChannel };
    }
    void telemetryClient.track("permission_granted", { attrs: { kind: "notifications" } });
    return { ok: true, pushChannel };
  },

  async disable(): Promise<{ ok: boolean }> {
    const deviceId = await getStableDeviceId();
    const res = await deviceService.updatePushToken(deviceId, {
      pushChannel: PUSH_CHANNEL(env.channel),
      pushToken: null,
    });
    return { ok: res.ok };
  },
};
