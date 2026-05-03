// 全局同意状态：在 RootNavigator 启动时读 SecureStore；未同意则强制弹 PrivacyConsent
// 页（不可绕过）。版本号变化时重置同意。
import * as React from "react";
import { env } from "../config/env";
import { clearConsent, readConsent, writeConsent, type ConsentState } from "../storage/consentStore";

interface ConsentContextValue {
  /** 已同意的版本与时间；未同意为 null。 */
  consent: ConsentState | null;
  /** 当前生效的隐私版本。 */
  currentVersion: string;
  loading: boolean;
  accept(): Promise<ConsentState>;
  revoke(): Promise<void>;
}

const Ctx = React.createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = React.useState<ConsentState | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void (async () => {
      const stored = await readConsent();
      if (stored && stored.version === env.privacyVersion) {
        setConsent(stored);
      } else {
        setConsent(null);
      }
      setLoading(false);
    })();
  }, []);

  const value = React.useMemo<ConsentContextValue>(
    () => ({
      consent,
      currentVersion: env.privacyVersion,
      loading,
      async accept() {
        const next = await writeConsent(env.privacyVersion);
        setConsent(next);
        return next;
      },
      async revoke() {
        await clearConsent();
        setConsent(null);
      },
    }),
    [consent, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConsent(): ConsentContextValue {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useConsent must be used inside <ConsentProvider />");
  return v;
}
