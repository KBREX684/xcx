// 设备注册 / 注销 / 推送令牌更新 / 版本检查。注册必须携带 privacyConsent=true。
import {
  mobileDeviceRegisterInputSchema,
  mobileDeviceSchema,
  mobilePushTokenUpdateInputSchema,
  mobileReleaseInfoSchema,
  type MobileDevice,
  type MobileDeviceRegisterInput,
  type MobilePushTokenUpdateInput,
  type MobileReleaseInfo,
} from "@agent-control-plane/domain/src/mobile";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { apiClient } from "./apiClient";
import { env } from "../config/env";
import { getStableDeviceId } from "../storage/deviceIdStore";

export const deviceService = {
  async buildRegisterInput(consent: { version: string; acceptedAt: string }): Promise<MobileDeviceRegisterInput> {
    const deviceId = await getStableDeviceId();
    const payload: MobileDeviceRegisterInput = {
      deviceId,
      platform: Platform.OS === "ios" ? "ios" : "android",
      appVersion: env.appVersion,
      appBuild: Application.nativeBuildVersion ?? undefined,
      osVersion: Platform.Version?.toString() ?? "0",
      deviceModel: Device.modelName ?? undefined,
      manufacturer: Device.manufacturer ?? undefined,
      channel: env.channel,
      privacyConsent: true,
      privacyConsentAt: consent.acceptedAt,
      privacyVersion: consent.version,
    };
    return mobileDeviceRegisterInputSchema.parse(payload);
  },

  register(input: MobileDeviceRegisterInput) {
    return apiClient.request<MobileDevice>({
      path: "/api/v1/mobile/devices",
      method: "POST",
      body: input,
      schema: mobileDeviceSchema,
      idempotencyPrefix: "device",
    });
  },

  unregister(deviceId: string) {
    return apiClient.request({
      path: `/api/v1/mobile/devices/${encodeURIComponent(deviceId)}`,
      method: "DELETE",
      idempotencyPrefix: "device",
    });
  },

  updatePushToken(deviceId: string, body: MobilePushTokenUpdateInput) {
    mobilePushTokenUpdateInputSchema.parse(body);
    return apiClient.request({
      path: `/api/v1/mobile/devices/${encodeURIComponent(deviceId)}/push-token`,
      method: "PATCH",
      body,
      idempotencyPrefix: "device",
    });
  },

  fetchRelease() {
    return apiClient.request<MobileReleaseInfo>({
      path: "/api/v1/mobile/releases/current",
      query: { channel: env.channel, platform: "android" },
      schema: mobileReleaseInfoSchema,
      anonymous: true,
    });
  },
};
