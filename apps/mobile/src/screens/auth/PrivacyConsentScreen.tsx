// 首屏隐私同意：用户必须勾选并点击"同意并继续"，才能进入应用。拒绝则退出 App。
// 文案需要把 SDK 范围、收集字段、第三方共享情况清楚列出，对应应用宝合规审核要点。
import * as React from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import {
  AppScreen,
  Button,
  Typography,
  palette,
  spacing,
} from "@agent-control-plane/mobile-ui";
import { useConsent } from "../../state/ConsentContext";
import { telemetryClient } from "../../telemetry/telemetryClient";

export interface PrivacyConsentScreenProps {
  onAccepted: () => void;
  onDeclined: () => void;
}

export function PrivacyConsentScreen({ onAccepted, onDeclined }: PrivacyConsentScreenProps) {
  const { accept, currentVersion } = useConsent();
  const [loading, setLoading] = React.useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await accept();
      telemetryClient.setConsentEnabled(true);
      void telemetryClient.track("consent_granted", { attrs: { version: currentVersion } });
      onAccepted();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen padded={false}>
      <View style={styles.header}>
        <Typography variant="titleLg">隐私与服务条款</Typography>
        <Typography variant="caption" tone="muted">
          版本 {currentVersion}
        </Typography>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Typography variant="body">
          欢迎使用蜂聚合控制台 App。为了向你提供企业项目控制面、审批通知与证据核验能力，
          我们需要在你授权后收集以下信息：
        </Typography>
        <Section title="我们会收集的字段">
          {[
            "登录账号、姓名、企业角色、租户标识",
            "设备型号、操作系统版本、应用版本、所在渠道",
            "App 内行为日志（关键路径耗时、错误堆栈），不包含输入正文",
            "证书核验时的二维码内容（仅在你主动扫描时获取）",
          ].map((line) => (
            <Bullet key={line} text={line} />
          ))}
        </Section>
        <Section title="我们不会收集">
          {[
            "通讯录、短信、通话记录、日历",
            "GPS 精确定位、IMEI、IDFA、SIM 序列号",
            "你输入的密码、令牌、私钥、证书私有材料",
          ].map((line) => (
            <Bullet key={line} text={line} />
          ))}
        </Section>
        <Section title="第三方 SDK">
          <Typography variant="body">
            App 内使用 Expo Modules（相机 / 安全存储 / 推送）、React Native 网络层。
            完整 SDK 列表与用途说明请见{" "}
            <Typography
              variant="body"
              tone="accent"
              onPress={() => void Linking.openURL("https://acp.example.com/legal/sdk")}
            >
              SDK 清单
            </Typography>。
          </Typography>
        </Section>
        <Section title="你的权利">
          {[
            "随时在「我的-隐私设置」中撤回授权并清除数据",
            "可在「我的-注销账户」中提交注销申请",
            "通过 privacy@example.com 联系我们提交查询/删除请求",
          ].map((line) => (
            <Bullet key={line} text={line} />
          ))}
        </Section>
        <Typography variant="caption" tone="muted" style={styles.footer}>
          点击下方"同意并继续"即表示你已阅读并接受
          <Typography
            variant="caption"
            tone="accent"
            onPress={() => void Linking.openURL("https://acp.example.com/legal/privacy")}
          >
            《隐私政策》
          </Typography>
          与
          <Typography
            variant="caption"
            tone="accent"
            onPress={() => void Linking.openURL("https://acp.example.com/legal/terms")}
          >
            《服务条款》
          </Typography>
          。
        </Typography>
      </ScrollView>
      <View style={styles.actions}>
        <Button label="不同意并退出" variant="ghost" onPress={onDeclined} fullWidth />
        <View style={{ height: spacing.sm }} />
        <Button label="同意并继续" loading={loading} onPress={handleAccept} fullWidth />
      </View>
    </AppScreen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Typography variant="title" weight="semibold" style={{ marginBottom: spacing.sm }}>
        {title}
      </Typography>
      {children}
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.dot} />
      <Typography variant="body" style={{ flex: 1 }}>
        {text}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  body: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginTop: spacing.lg,
  },
  bullet: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.xs,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.accent,
    marginTop: 9,
    marginRight: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
  },
  actions: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    backgroundColor: palette.bgPrimary,
  },
});
