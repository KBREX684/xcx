// 隐私同意持久化：合规要求"用户首次启动必须先同意隐私政策才能继续"。
// 同意状态包含版本号，隐私版本变化时（如新增 SDK）会重置同意，再次弹窗。
import * as SecureStore from "expo-secure-store";

const KEY_VERSION = "acp.consent.version";
const KEY_AT = "acp.consent.at";

export interface ConsentState {
  version: string;
  acceptedAt: string;
}

export async function readConsent(): Promise<ConsentState | null> {
  const [version, acceptedAt] = await Promise.all([
    SecureStore.getItemAsync(KEY_VERSION),
    SecureStore.getItemAsync(KEY_AT),
  ]);
  if (!version || !acceptedAt) return null;
  return { version, acceptedAt };
}

export async function writeConsent(version: string): Promise<ConsentState> {
  const acceptedAt = new Date().toISOString();
  await Promise.all([
    SecureStore.setItemAsync(KEY_VERSION, version),
    SecureStore.setItemAsync(KEY_AT, acceptedAt),
  ]);
  return { version, acceptedAt };
}

export async function clearConsent(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_VERSION),
    SecureStore.deleteItemAsync(KEY_AT),
  ]);
}
