// 根导航器：协调 AuthWelcome -> ConsentGate -> MainNavigator。
import * as React from "react";
import { BackHandler } from "react-native";
import { LoadingState, AppScreen } from "@agent-control-plane/mobile-ui";
import { useAuth } from "../state/AuthContext";
import { useConsent } from "../state/ConsentContext";
import { PrivacyConsentScreen } from "../screens/auth/PrivacyConsentScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { LegalScreen } from "../screens/auth/LegalScreen";
import { MainNavigator } from "./MainNavigator";

export function RootNavigator() {
  const { consent, loading: consentLoading } = useConsent();
  const { session, loading: authLoading } = useAuth();
  const [legalPage, setLegalPage] = React.useState<"privacy" | "terms" | null>(null);

  if (consentLoading || authLoading) {
    return (
      <AppScreen>
        <LoadingState label="启动中…" />
      </AppScreen>
    );
  }

  if (session && !consent) {
    return (
      <PrivacyConsentScreen
        onAccepted={() => {
          // ConsentProvider 内部已 setState；这里无需额外操作。
        }}
        onDeclined={() => {
          BackHandler.exitApp();
        }}
      />
    );
  }

  if (!session) {
    if (legalPage) {
      return <LegalScreen page={legalPage} onBack={() => setLegalPage(null)} />;
    }
    return <LoginScreen onShowLegal={(p) => setLegalPage(p)} />;
  }

  return <MainNavigator />;
}
