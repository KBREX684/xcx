import * as React from "react";
import { Alert, ScrollView, StyleSheet, Switch, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AppBar,
  AppScreen,
  ApprovalsIcon,
  BellIcon,
  BotIcon,
  Card,
  CertificateIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ListItem,
  ListIcon,
  MessageIcon,
  SectionHeader,
  SettingsIcon,
  ShieldIcon,
  Typography,
  UserIcon,
  WorkflowIcon,
  palette,
  spacing,
  toast,
} from "@agent-control-plane/mobile-ui";
import { useAuth } from "../../state/AuthContext";
import { useConsent } from "../../state/ConsentContext";
import { env } from "../../config/env";
import { pushTokenService } from "../../services/pushTokenService";
import type { RouteContext } from "../../navigation/routes";

const PUSH_PREF_KEY = "acp.mobile.push.enabled.v1";

export function SettingsScreen({ navigate, goBack, canGoBack }: RouteContext) {
  const { session, signOut } = useAuth();
  const { consent, revoke } = useConsent();
  const [working, setWorking] = React.useState(false);
  const [pushEnabled, setPushEnabled] = React.useState(false);
  const [pushBusy, setPushBusy] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(PUSH_PREF_KEY);
        setPushEnabled(raw === "1");
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const handleTogglePush = async (next: boolean) => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (!next) {
        const res = await pushTokenService.disable();
        if (res.ok) {
          await AsyncStorage.setItem(PUSH_PREF_KEY, "0");
          setPushEnabled(false);
          toast.success("已关闭通知");
        } else {
          toast.error("关闭通知失败");
        }
      } else {
        const res = await pushTokenService.enable();
        if (res.ok) {
          await AsyncStorage.setItem(PUSH_PREF_KEY, "1");
          setPushEnabled(true);
          toast.success("已开启通知");
        } else if (res.reason === "denied") {
          toast.warn("未授予通知权限，可在系统设置中开启");
        } else {
          toast.error("通知开启失败");
        }
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("确认退出登录？", "下次需要重新输入账号。", [
      { text: "取消", style: "cancel" },
      {
        text: "退出",
        style: "destructive",
        onPress: async () => {
          setWorking(true);
          try {
            await signOut();
          } finally {
            setWorking(false);
          }
        },
      },
    ]);
  };

  const handleRevoke = () => {
    Alert.alert("撤回隐私同意将清空授权", "撤回后下次启动需要重新阅读隐私政策。", [
      { text: "取消", style: "cancel" },
      {
        text: "撤回",
        style: "destructive",
        onPress: async () => {
          await revoke();
          await signOut();
        },
      },
    ]);
  };

  return (
    <AppScreen padded={false}>
      <AppBar title="我的" onBack={canGoBack ? goBack : undefined} />
      <ScrollView contentContainerStyle={styles.body}>
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <UserIcon size={22} color={palette.accent} />
            </View>
            <View style={styles.profileText}>
              <Typography variant="titleLg" weight="semibold" numberOfLines={1}>
                {session?.name ?? "未登录"}
              </Typography>
              <Typography variant="caption" tone="muted" numberOfLines={1}>
                角色 {session?.role ?? "-"} · 成员 {session?.memberId ?? "-"}
              </Typography>
            </View>
          </View>
        </Card>

        <View style={styles.section}>
          <SectionHeader eyebrow="guide" title="帮助与引导" />
          <View style={styles.group}>
            <ListItem
              leading={<ListIcon size={18} color={palette.accent} />}
              title="产品使用文档"
              subtitle="快速了解团队、项目、流程、审批和证书的使用方式"
              chevron
              divider
              onPress={() => navigate({ name: "ProductGuide" })}
            />
            <ListItem
              leading={<CheckCircleIcon size={18} color={palette.accent} />}
              title="新手引导"
              subtitle="重新查看蜂聚合移动端的核心概念与使用路径"
              chevron
              onPress={() => navigate({ name: "OnboardingGuide" })}
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader eyebrow="workbench" title="工作台入口" />
          <View style={styles.group}>
            <ListItem
              leading={<ApprovalsIcon size={18} color={palette.accent} />}
              title="审批中心"
              subtitle="处理待审批与查看审批历史"
              chevron
              divider
              onPress={() => navigate({ name: "ApprovalList" })}
            />
            <ListItem
              leading={<MessageIcon size={18} color={palette.accent} />}
              title="收件箱"
              subtitle="查看任务回执、提及、异常和归档消息"
              chevron
              divider
              onPress={() => navigate({ name: "Inbox" })}
            />
            <ListItem
              leading={<BotIcon size={18} color={palette.accent} />}
              title="Agent 配置"
              subtitle="创建智能体、维护能力和团队绑定"
              chevron
              divider
              onPress={() => navigate({ name: "AgentList" })}
            />
            <ListItem
              leading={<WorkflowIcon size={18} color={palette.accent} />}
              title="流程模板"
              subtitle="用预设和节点列表搭建移动端流程"
              chevron
              divider
              onPress={() => navigate({ name: "WorkflowList" })}
            />
            <ListItem
              leading={<CertificateIcon size={18} color={palette.accent} />}
              title="证书核验"
              subtitle="手输核验码或扫码查看证据链"
              chevron
              onPress={() => navigate({ name: "CertificateVerify" })}
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader eyebrow="notifications" title="通知与设备" />
          <View style={styles.group}>
            <ListItem
              leading={<BellIcon size={18} color={palette.accent} />}
              title={pushEnabled ? "通知已开启" : "通知已关闭"}
              subtitle="审批 / 异常 Run 实时提醒，可随时关闭"
              divider
              trailing={
                <Switch
                  value={pushEnabled}
                  onValueChange={(v) => void handleTogglePush(v)}
                  disabled={pushBusy}
                  trackColor={{ false: palette.bgSubtle, true: palette.accentSoft }}
                  thumbColor={pushEnabled ? palette.accent : palette.textMuted}
                />
              }
            />
            <ListItem
              leading={<ShieldIcon size={18} color={palette.accent} />}
              title="账户安全 / 设备列表"
              subtitle="管理已登录设备与会话"
              chevron
              onPress={() => navigate({ name: "AccountSecurity" })}
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader eyebrow="preferences" title="偏好" />
          <View style={styles.group}>
            <ListItem
              leading={<SettingsIcon size={18} color={palette.accent} />}
              title="偏好设置"
              subtitle="语言、振动、隐私偏好"
              chevron
              onPress={() => navigate({ name: "Preferences" })}
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader eyebrow="compliance" title="合规" />
          <Typography variant="caption" tone="muted" style={styles.sectionHint}>
            隐私版本 {consent?.version ?? env.privacyVersion} · 同意时间 {consent?.acceptedAt ?? "-"}
          </Typography>
          <View style={styles.group}>
            <ListItem
              leading={<ShieldIcon size={18} color={palette.accent} />}
              title="隐私政策"
              chevron
              divider
              onPress={() => navigate({ name: "Legal", page: "privacy" })}
            />
            <ListItem
              leading={<CertificateIcon size={18} color={palette.accent} />}
              title="服务条款"
              chevron
              divider
              onPress={() => navigate({ name: "Legal", page: "terms" })}
            />
            <ListItem
              leading={<ChevronRightIcon size={18} color={palette.accent} />}
              title="第三方 SDK 清单"
              chevron
              onPress={() => navigate({ name: "Legal", page: "sdk" })}
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader eyebrow="about" title="关于" />
          <View style={styles.group}>
            <ListItem
              title="版本"
              trailing={<Typography variant="body" tone="muted">{env.appVersion}</Typography>}
              divider
            />
            <ListItem
              title="渠道"
              trailing={<Typography variant="body" tone="muted">{env.channel}</Typography>}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.group}>
            <ListItem
              title={working ? "正在退出..." : "退出登录"}
              destructive
              divider
              disabled={working}
              onPress={handleSignOut}
            />
            <ListItem title="撤回隐私同意" destructive onPress={handleRevoke} />
          </View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  profileCard: {
    padding: spacing.lg,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.accentSoft,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionHint: {
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },
  group: {
    backgroundColor: palette.bgSurface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    overflow: "hidden",
  },
});
