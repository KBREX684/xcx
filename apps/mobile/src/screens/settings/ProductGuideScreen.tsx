import * as React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  AppBar,
  AppScreen,
  Card,
  SegmentedControl,
  Typography,
  palette,
  spacing,
} from "@agent-control-plane/mobile-ui";
import { productGuideContent } from "../../onboarding/content";
import type { RouteContext } from "../../navigation/routes";

type GuideId = (typeof productGuideContent)[number]["id"];

const guideOptions = productGuideContent.map((section) => ({
  value: section.id,
  label: section.label,
}));

export function ProductGuideScreen({ goBack, canGoBack }: RouteContext) {
  const [active, setActive] = React.useState<GuideId>(productGuideContent[0].id);
  const section =
    productGuideContent.find((item) => item.id === active) ?? productGuideContent[0];

  return (
    <AppScreen padded={false}>
      <AppBar title="产品使用文档" onBack={canGoBack ? goBack : undefined} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card style={styles.hero}>
          <Typography variant="caption" tone="accent" weight="semibold">
            guide
          </Typography>
          <Typography variant="titleLg" weight="semibold" style={styles.heroTitle}>
            用移动端完成蜂聚合核心闭环
          </Typography>
          <Typography variant="body" tone="secondary" style={styles.heroDesc}>
            这里覆盖登录、团队、项目、流程、审批、证书和收件箱的日常操作。复杂后台设置建议在 Web 控制台完成。
          </Typography>
        </Card>

        <SegmentedControl
          options={guideOptions}
          value={active}
          onChange={(next) => setActive(next as GuideId)}
          style={styles.segmented}
        />

        <View style={styles.sectionHeader}>
          <Typography variant="titleLg" weight="semibold">
            {section.title}
          </Typography>
          <Typography variant="body" tone="secondary" style={styles.sectionSummary}>
            {section.summary}
          </Typography>
        </View>

        <View style={styles.stepList}>
          {section.steps.map((step, index) => (
            <Card key={step.title} style={styles.stepCard}>
              <View style={styles.stepIndex}>
                <Typography variant="caption" tone="inverse" weight="semibold">
                  {index + 1}
                </Typography>
              </View>
              <View style={styles.stepBody}>
                <Typography variant="bodyLg" weight="semibold">
                  {step.title}
                </Typography>
                <Typography variant="body" tone="secondary" style={styles.stepText}>
                  {step.body}
                </Typography>
              </View>
            </Card>
          ))}
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
  hero: {
    padding: spacing.lg,
  },
  heroTitle: {
    marginTop: spacing.xs,
  },
  heroDesc: {
    marginTop: spacing.sm,
  },
  segmented: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    marginTop: spacing.xl,
  },
  sectionSummary: {
    marginTop: spacing.sm,
  },
  stepList: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  stepCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  stepIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.accent,
    marginTop: 1,
  },
  stepBody: {
    flex: 1,
    minWidth: 0,
  },
  stepText: {
    marginTop: spacing.xs,
  },
});
