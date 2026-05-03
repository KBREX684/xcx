// 会话令牌持久化：使用 expo-secure-store 把 access/refresh/memberId 写入系统 Keychain
// （Android 走 KeyStore）。注意：SecureStore value 大小有限制，仅存关键令牌。
import * as SecureStore from "expo-secure-store";

const KEY_ACCESS = "acp.session.access";
const KEY_REFRESH = "acp.session.refresh";
const KEY_MEMBER = "acp.session.member";
const KEY_ROLE = "acp.session.role";
const KEY_NAME = "acp.session.name";

export interface PersistedSession {
  accessToken: string;
  refreshToken: string;
  memberId: string;
  name: string;
  role: string;
}

export async function readSession(): Promise<PersistedSession | null> {
  const [accessToken, refreshToken, memberId, role, name] = await Promise.all([
    SecureStore.getItemAsync(KEY_ACCESS),
    SecureStore.getItemAsync(KEY_REFRESH),
    SecureStore.getItemAsync(KEY_MEMBER),
    SecureStore.getItemAsync(KEY_ROLE),
    SecureStore.getItemAsync(KEY_NAME),
  ]);
  if (!accessToken || !refreshToken || !memberId || !role || !name) return null;
  return { accessToken, refreshToken, memberId, role, name };
}

export async function writeSession(session: PersistedSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEY_ACCESS, session.accessToken),
    SecureStore.setItemAsync(KEY_REFRESH, session.refreshToken),
    SecureStore.setItemAsync(KEY_MEMBER, session.memberId),
    SecureStore.setItemAsync(KEY_ROLE, session.role),
    SecureStore.setItemAsync(KEY_NAME, session.name),
  ]);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_ACCESS),
    SecureStore.deleteItemAsync(KEY_REFRESH),
    SecureStore.deleteItemAsync(KEY_MEMBER),
    SecureStore.deleteItemAsync(KEY_ROLE),
    SecureStore.deleteItemAsync(KEY_NAME),
  ]);
}
