// 集中读取 EXPO_PUBLIC_* / app.config 中的 extra；运行时唯一来源。
import Constants from "expo-constants";

interface MobileEnv {
  apiBaseUrl: string;
  privacyVersion: string;
  channel: string;
  appVersion: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

function read(key: string, fallback: string): string {
  const raw = extra[key];
  return typeof raw === "string" && raw.length > 0 ? raw : fallback;
}

export const env: MobileEnv = {
  apiBaseUrl: read("apiBaseUrl", ""),
  privacyVersion: read("privacyVersion", "2026-04-26"),
  channel: read("channel", "yingyongbao"),
  appVersion: Constants.expoConfig?.version ?? "0.0.0",
};
