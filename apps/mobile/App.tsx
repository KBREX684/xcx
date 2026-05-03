// App 入口：QueryClient + Auth/Consent Provider + RootNavigator + telemetry 启动。
import * as React from "react";
import { View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastHost } from "@agent-control-plane/mobile-ui";
import { AuthProvider } from "./src/state/AuthContext";
import { ConsentProvider, useConsent } from "./src/state/ConsentContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { telemetryClient } from "./src/telemetry/telemetryClient";
import { getColdStartMark } from "./src/telemetry/appStartMark";
import { setStaleCacheObserver } from "./src/cache/staleCache";
import { pinningStore, setPinningObserver } from "./src/security/certificatePinning";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function TelemetryBootstrap() {
  const { consent } = useConsent();

  React.useEffect(() => {
    if (!consent) return;
    telemetryClient.setConsentEnabled(true);
    void telemetryClient.start();
    void telemetryClient.track("app_cold_start", {
      attrs: { startedAt: new Date(getColdStartMark()).toISOString() },
    });
    setStaleCacheObserver((obs) => {
      // 仅采样命中/过期/损坏；miss 量级过大不上报，避免淹没遥测通道。
      if (obs.outcome === "miss") return;
      void telemetryClient.track("cache_observation", {
        level: obs.outcome === "corrupt" ? "warn" : "info",
        attrs: {
          scope: obs.scope.split(".")[0] ?? "unknown", // 仅取前缀，防止 memberId 泄漏
          outcome: obs.outcome,
          ageMs: "ageMs" in obs ? obs.ageMs : null,
        },
      });
    });
    // L-CODE-15：恢复本地证书固定策略（默认 OFF），并把 violation 事件转发到 telemetry。
    void pinningStore.load();
    setPinningObserver((evt) => {
      if (evt.kind !== "evaluation") return;
      if (evt.outcome === "out_of_scope" || evt.outcome === "allow") return;
      void telemetryClient.track("cache_observation", {
        level: evt.outcome === "violation" ? "error" : "warn",
        attrs: {
          scope: "pinning",
          outcome: evt.outcome,
          mode: evt.mode,
        },
      });
    });
    return () => {
      setStaleCacheObserver(null);
      setPinningObserver(null);
      void telemetryClient.stop();
      telemetryClient.setConsentEnabled(false);
    };
  }, [consent]);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConsentProvider>
        <AuthProvider>
          <View style={{ flex: 1 }}>
            <TelemetryBootstrap />
            <RootNavigator />
            <ToastHost />
          </View>
        </AuthProvider>
      </ConsentProvider>
    </QueryClientProvider>
  );
}
