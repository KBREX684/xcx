// 法务静态页：隐私政策 / 服务条款 / SDK 清单。所有正文内嵌（避免 H5 弹窗），
// 兼顾应用宝离线审核要求。
import * as React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppBar, AppScreen, BrandLockup, Typography, palette, spacing } from "@agent-control-plane/mobile-ui";

export type LegalPage = "privacy" | "terms" | "sdk";

export interface LegalScreenProps {
  page: LegalPage;
  onBack: () => void;
}

const TITLES: Record<LegalPage, string> = {
  privacy: "隐私政策",
  terms: "服务条款",
  sdk: "第三方 SDK 清单",
};

export function LegalScreen({ page, onBack }: LegalScreenProps) {
  return (
    <AppScreen padded={false}>
      <AppBar title={TITLES[page]} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <BrandLockup size="hero" showEnglish />
          <Typography variant="caption" tone="muted" style={styles.heroSub}>
            {TITLES[page]} · 最近更新 2025
          </Typography>
        </View>
        {page === "privacy" ? <PrivacyContent /> : null}
        {page === "terms" ? <TermsContent /> : null}
        {page === "sdk" ? <SdkContent /> : null}
      </ScrollView>
    </AppScreen>
  );
}

function PrivacyContent() {
  return (
    <View>
      <P>
        本应用由【蜂聚合智能科技有限公司】提供。我们仅在你主动登录后收集与企业控制面运营
        相关的最少必要信息，并按照《中华人民共和国个人信息保护法》《App 违法违规收集使用
        个人信息行为认定方法》等执行。
      </P>
      <H>一、我们收集哪些信息</H>
      <P>账号与身份：登录账号、姓名、企业角色、租户标识。</P>
      <P>设备与诊断：设备型号、操作系统版本、应用版本、渠道。</P>
      <P>使用日志：关键路径耗时、错误堆栈、traceId。不含输入正文与凭据。</P>
      <H>二、我们如何使用</H>
      <P>仅用于：身份核验、推送提醒、稳定性诊断、合规审计。</P>
      <H>三、第三方共享</H>
      <P>除依法配合执法机关外，我们不会向任何第三方共享你的个人信息。</P>
      <H>四、数据保存与删除</H>
      <P>账号注销后 30 天内删除全部个人信息备份。日志保留 180 天后匿名化。</P>
      <H>五、联系</H>
      <P>邮箱：privacy@example.com  电话：400-000-0000</P>
    </View>
  );
}

function TermsContent() {
  return (
    <View>
      <H>一、服务说明</H>
      <P>本应用为企业自有员工面向已签约客户提供项目控制面服务。</P>
      <H>二、账户与责任</H>
      <P>账号由企业管理员分配，禁止个人买卖、出借。</P>
      <H>三、禁止行为</H>
      <P>禁止通过本应用从事任何违反国家法律法规的活动。</P>
      <H>四、知识产权</H>
      <P>应用界面、文案、商标归本公司所有；证据数据归签约客户所有。</P>
      <H>五、终止</H>
      <P>违反本条款的，公司有权终止服务并保留追究法律责任的权利。</P>
    </View>
  );
}

function SdkContent() {
  return (
    <View>
      <P>下表为本应用集成的第三方 SDK 清单与用途。详细收集字段见 SDK 提供方页面。</P>
      <Item name="Expo Modules (Camera/SecureStore/Notifications)" purpose="扫码核验、令牌存储、推送通知" privacy="https://expo.dev/privacy" />
      <Item name="React Native" purpose="跨端 UI 与网络层" privacy="https://reactnative.dev/" />
      <Item name="@tanstack/react-query" purpose="客户端数据缓存（仅本地内存）" privacy="https://tanstack.com" />
    </View>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="title" weight="semibold" style={{ marginTop: spacing.lg }}>
      {children}
    </Typography>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body" style={{ marginTop: spacing.sm }}>
      {children}
    </Typography>
  );
}

function Item({ name, purpose, privacy }: { name: string; purpose: string; privacy: string }) {
  return (
    <View style={{ marginTop: spacing.md }}>
      <Typography variant="body" weight="semibold">
        {name}
      </Typography>
      <Typography variant="caption" tone="muted">
        用途：{purpose}
      </Typography>
      <Typography variant="caption" tone="muted">
        合规：{privacy}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  heroSub: {
    marginTop: spacing.sm,
    letterSpacing: 0.4,
  },
});
