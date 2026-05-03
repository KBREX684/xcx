import * as React from "react";
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  AppScreen,
  BrandLockup,
  Button,
  Card,
  Icons,
  Typography,
  palette,
  radius,
  spacing,
} from "@agent-control-plane/mobile-ui";
import { onboardingIntroPages } from "../../onboarding/content";
import { useAuth } from "../../state/AuthContext";
import { useConsent } from "../../state/ConsentContext";
import { markOnboardingComplete, readOnboardingState } from "../../state/onboardingStore";
import { deviceService } from "../../services/deviceService";
import { telemetryClient } from "../../telemetry/telemetryClient";
import { PrivacyConsentScreen } from "./PrivacyConsentScreen";

export interface LoginScreenProps {
  onShowLegal: (page: "privacy" | "terms") => void;
}

const TOTAL_PAGES = onboardingIntroPages.length + 1;
const LOGIN_PAGE_INDEX = TOTAL_PAGES - 1;

export function LoginScreen({ onShowLegal }: LoginScreenProps) {
  const { width } = useWindowDimensions();
  const pagerRef = React.useRef<ScrollView>(null);
  const { signIn } = useAuth();
  const { consent } = useConsent();
  const [account, setAccount] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [ready, setReady] = React.useState(false);
  const [showPrivacy, setShowPrivacy] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    void (async () => {
      const state = await readOnboardingState();
      if (!mounted) return;
      const initialIndex = state.completed ? LOGIN_PAGE_INDEX : 0;
      setPageIndex(initialIndex);
      setReady(true);
      requestAnimationFrame(() => {
        pagerRef.current?.scrollTo({ x: initialIndex * width, animated: false });
      });
    })();
    return () => {
      mounted = false;
    };
  }, [width]);

  const commitPageIndex = React.useCallback((nextIndex: number) => {
    setPageIndex(nextIndex);
    if (nextIndex === LOGIN_PAGE_INDEX) {
      void markOnboardingComplete();
    }
  }, []);

  const scrollToPage = React.useCallback(
    (nextIndex: number) => {
      const safeIndex = Math.max(0, Math.min(LOGIN_PAGE_INDEX, nextIndex));
      commitPageIndex(safeIndex);
      pagerRef.current?.scrollTo({ x: safeIndex * width, animated: true });
    },
    [commitPageIndex, width],
  );

  const returnFromPrivacyToLogin = React.useCallback(() => {
    setShowPrivacy(false);
    commitPageIndex(LOGIN_PAGE_INDEX);
    requestAnimationFrame(() => {
      pagerRef.current?.scrollTo({ x: LOGIN_PAGE_INDEX * width, animated: false });
    });
  }, [commitPageIndex, width]);

  const handleSignIn = async () => {
    const trimmed = account.trim();
    if (!trimmed) {
      Alert.alert("提示", "请填写登录账号");
      return;
    }
    if (!password) {
      Alert.alert("提示", "请填写密码");
      return;
    }
    if (!consent) {
      setShowPrivacy(true);
      return;
    }
    setSubmitting(true);
    const start = Date.now();
    try {
      const result = await signIn({ account: trimmed, password });
      if (!result.ok) {
        void telemetryClient.track("login_failure", {
          outcome: "error",
          durationMs: Date.now() - start,
          attrs: { reason: result.message?.slice(0, 64) ?? "unknown" },
        });
        Alert.alert("登录失败", result.message ?? "请稍后重试");
        return;
      }
      void telemetryClient.track("login_success", {
        durationMs: Date.now() - start,
      });
      try {
        const input = await deviceService.buildRegisterInput(consent);
        await deviceService.register(input);
      } catch {
        // 设备注册失败不阻塞登录，首页会在后续刷新中继续兜底。
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (showPrivacy) {
    return (
      <PrivacyConsentScreen
        onAccepted={returnFromPrivacyToLogin}
        onDeclined={() => {
          setShowPrivacy(false);
          BackHandler.exitApp();
        }}
      />
    );
  }

  return (
    <AppScreen padded={false}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.topBar}>
          <BrandLockup />
          {pageIndex !== LOGIN_PAGE_INDEX ? (
            <Button
              label="跳过"
              variant="ghost"
              size="sm"
              onPress={() => scrollToPage(LOGIN_PAGE_INDEX)}
            />
          ) : (
            <Button label="介绍" variant="ghost" size="sm" onPress={() => scrollToPage(0)} />
          )}
        </View>

        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
            commitPageIndex(nextIndex);
          }}
          style={styles.pager}
        >
          {onboardingIntroPages.map((page, index) => {
            const Icon = Icons[page.icon];
            return (
              <View key={page.id} style={[styles.page, { width }]}>
                <View style={styles.heroCard}>
                  <View style={styles.iconBadge}>
                    <Icon size={34} color={palette.accentStrong} />
                  </View>
                  <Typography variant="caption" tone="accent" weight="semibold">
                    {page.eyebrow}
                  </Typography>
                  <Typography variant="display" weight="bold" style={styles.heroTitle}>
                    {page.title}
                  </Typography>
                  <Typography variant="bodyLg" tone="secondary" style={styles.heroDesc}>
                    {page.description}
                  </Typography>
                  <View style={styles.bulletList}>
                    {page.bullets.map((item) => (
                      <View key={item} style={styles.bulletRow}>
                        <View style={styles.bulletDot} />
                        <Typography variant="body" tone="secondary" style={styles.bulletText}>
                          {item}
                        </Typography>
                      </View>
                    ))}
                  </View>
                </View>
                <Button
                  label={index === onboardingIntroPages.length - 1 ? "进入登录" : "下一页"}
                  onPress={() => scrollToPage(index + 1)}
                  fullWidth
                />
              </View>
            );
          })}

          <View style={[styles.page, { width }]}>
            <ScrollView
              contentContainerStyle={styles.loginScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.loginHeadline}>
                <Typography variant="caption" tone="accent" weight="semibold">
                  secure workspace
                </Typography>
                <Typography variant="display" weight="bold" style={styles.loginTitle}>
                  登录蜂聚合工作区
                </Typography>
                <Typography variant="bodyLg" tone="secondary" style={styles.loginDesc}>
                  继续处理项目、审批、Agent 回复和证书核验。新成员请先联系管理员开通账号。
                </Typography>
              </View>

              <Card style={styles.card}>
                <Typography variant="caption" tone="muted">
                  账号
                </Typography>
                <TextInput
                  value={account}
                  onChangeText={setAccount}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  placeholder="企业邮箱或工号"
                  placeholderTextColor={palette.textMuted}
                  style={styles.input}
                />

                <Typography variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
                  密码
                </Typography>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  placeholder="********"
                  placeholderTextColor={palette.textMuted}
                  style={styles.input}
                />

                {!consent ? (
                  <Typography variant="caption" tone="muted" style={styles.consentHint}>
                    首次登录前需要阅读并同意隐私政策。点击登录后会先进入隐私确认页，不会提前提交账号密码。
                  </Typography>
                ) : null}

                <View style={{ marginTop: spacing.lg }}>
                  <Button
                    label={consent ? "登录" : "阅读隐私政策后登录"}
                    onPress={handleSignIn}
                    loading={submitting}
                    fullWidth
                  />
                </View>
              </Card>

              <Card style={styles.notice}>
                <Typography variant="body" weight="semibold">
                  申请开通账号
                </Typography>
                <Typography variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
                  当前版本不开放自助注册。请联系工作区管理员创建企业账号，并确认你已加入正确团队。
                </Typography>
                <View style={{ marginTop: spacing.md }}>
                  <Button
                    label="查看开通说明"
                    variant="secondary"
                    size="sm"
                    onPress={() =>
                      Alert.alert(
                        "如何开通账号",
                        "请将你的企业邮箱、所属团队和需要参与的项目发送给工作区管理员，由管理员在 Web 控制台创建账号。",
                      )
                    }
                    fullWidth
                  />
                </View>
              </Card>

              <View style={styles.legalRow}>
                <Typography variant="caption" tone="muted">
                  登录即代表你已阅读
                </Typography>
                <Pressable onPress={() => onShowLegal("privacy")}>
                  <Typography variant="caption" tone="accent">
                    《隐私政策》
                  </Typography>
                </Pressable>
                <Typography variant="caption" tone="muted">
                  与
                </Typography>
                <Pressable onPress={() => onShowLegal("terms")}>
                  <Typography variant="caption" tone="accent">
                    《服务条款》
                  </Typography>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </ScrollView>

        {ready ? (
          <View style={styles.dots}>
            {Array.from({ length: TOTAL_PAGES }).map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === pageIndex ? styles.dotActive : null]}
              />
            ))}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    justifyContent: "space-between",
  },
  heroCard: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  iconBadge: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    marginBottom: spacing.xl,
  },
  heroTitle: {
    marginTop: spacing.sm,
  },
  heroDesc: {
    marginTop: spacing.md,
  },
  bulletList: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.brandWarm,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
  },
  loginScroll: {
    paddingBottom: spacing.xl,
  },
  loginHeadline: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  loginTitle: {
    marginTop: spacing.sm,
  },
  loginDesc: {
    marginTop: spacing.sm,
  },
  card: {
    marginTop: spacing.sm,
  },
  input: {
    marginTop: spacing.xs,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    paddingHorizontal: spacing.md,
    color: palette.textPrimary,
    backgroundColor: palette.bgSurface,
  },
  consentHint: {
    marginTop: spacing.md,
  },
  notice: {
    marginTop: spacing.md,
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: spacing.lg,
    gap: 4,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingBottom: spacing.lg,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.borderStrong,
  },
  dotActive: {
    width: 22,
    backgroundColor: palette.accent,
  },
});
