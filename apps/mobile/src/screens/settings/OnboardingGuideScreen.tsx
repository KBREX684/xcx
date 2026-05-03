import * as React from "react";
import { StyleSheet, View } from "react-native";
import {
  AppBar,
  AppScreen,
  Button,
  Card,
  Icons,
  Typography,
  palette,
  radius,
  spacing,
} from "@agent-control-plane/mobile-ui";
import { onboardingIntroPages } from "../../onboarding/content";
import type { RouteContext } from "../../navigation/routes";

const LAST_INDEX = onboardingIntroPages.length - 1;

export function OnboardingGuideScreen({ goBack, canGoBack }: RouteContext) {
  const [index, setIndex] = React.useState(0);
  const page = onboardingIntroPages[index] ?? onboardingIntroPages[0];
  const Icon = Icons[page.icon];

  return (
    <AppScreen padded={false}>
      <AppBar title="新手引导" onBack={canGoBack ? goBack : undefined} />
      <View style={styles.body}>
        <Card style={styles.card}>
          <View style={styles.iconBadge}>
            <Icon size={34} color={palette.accentStrong} />
          </View>
          <Typography variant="caption" tone="accent" weight="semibold">
            {page.eyebrow}
          </Typography>
          <Typography variant="display" weight="bold" style={styles.title}>
            {page.title}
          </Typography>
          <Typography variant="bodyLg" tone="secondary" style={styles.desc}>
            {page.description}
          </Typography>
          <View style={styles.bullets}>
            {page.bullets.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Typography variant="body" tone="secondary" style={styles.bulletText}>
                  {item}
                </Typography>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.dots}>
          {onboardingIntroPages.map((item, itemIndex) => (
            <View
              key={item.id}
              style={[styles.dot, itemIndex === index ? styles.dotActive : null]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            label="上一页"
            variant="secondary"
            disabled={index === 0}
            onPress={() => setIndex((value) => Math.max(0, value - 1))}
            fullWidth
          />
          <Button
            label={index === LAST_INDEX ? "完成" : "下一页"}
            onPress={() => {
              if (index === LAST_INDEX) {
                goBack();
              } else {
                setIndex((value) => Math.min(LAST_INDEX, value + 1));
              }
            }}
            fullWidth
          />
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    padding: spacing.lg,
  },
  card: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
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
  title: {
    marginTop: spacing.sm,
  },
  desc: {
    marginTop: spacing.md,
  },
  bullets: {
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
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
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
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
