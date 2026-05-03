// 全局会话状态：负责启动时读取 SecureStore、登录后写入、登出清空、apiClient 的
// onSessionInvalid 回调拉回未登录态。
import * as React from "react";
import { authService } from "../services/authService";
import { onSessionInvalid } from "../services/apiClient";
import { clearSession, readSession, type PersistedSession } from "../storage/secureTokenStore";
import { staleCache } from "../cache/staleCache";

interface AuthContextValue {
  session: PersistedSession | null;
  loading: boolean;
  signIn(input: { account: string; password: string }): Promise<{ ok: boolean; message?: string }>;
  signOut(): Promise<void>;
}

const Ctx = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<PersistedSession | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void (async () => {
      const stored = await readSession();
      setSession(stored);
      setLoading(false);
    })();
    onSessionInvalid(() => {
      setSession(null);
    });
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      async signIn(input) {
        const result = await authService.loginWithPassword(input);
        if (!result.ok) return { ok: false, message: result.error.message };
        setSession({
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken,
          memberId: result.data.memberId,
          role: result.data.role,
          name: result.data.name,
        });
        return { ok: true };
      },
      async signOut() {
        await authService.logout();
        await clearSession();
        // 多账户共享设备时，必须清空只读缓存，避免下一位用户读到上一位的数据。
        await staleCache.clearAll();
        setSession(null);
      },
    }),
    [session, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthContextValue {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider />");
  return v;
}
