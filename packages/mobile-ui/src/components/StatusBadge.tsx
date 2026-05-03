// 状态徽章：根据语义渲染颜色，不直接接收 hex。tone 与 size 由调用方控制。
import * as React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { palette, radius, spacing, fontSize, fontWeight } from "../tokens";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

export interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  /** 节制使用 dot：仅在卡片密集列表里给到一眼可读的状态点。 */
  dot?: boolean;
  testID?: string;
}

export function StatusBadge({ label, tone = "neutral", dot = false, testID }: StatusBadgeProps) {
  const palettePair = TONE_PALETTE[tone];
  return (
    <View
      testID={testID}
      style={[styles.badge, { backgroundColor: palettePair.bg, borderColor: palettePair.border }]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: palettePair.fg }]} /> : null}
      <Text style={[styles.text, { color: palettePair.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const TONE_PALETTE: Record<StatusTone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: palette.bgSubtle, fg: palette.textSecondary, border: palette.border },
  info: { bg: "rgba(88,98,168,0.12)", fg: palette.info, border: "rgba(88,98,168,0.18)" },
  success: { bg: "rgba(82,113,101,0.13)", fg: palette.success, border: "rgba(82,113,101,0.18)" },
  warning: { bg: "rgba(179,122,29,0.15)", fg: palette.warning, border: "rgba(179,122,29,0.2)" },
  danger: { bg: "rgba(173,79,63,0.12)", fg: palette.danger, border: "rgba(173,79,63,0.18)" },
  accent: { bg: palette.accentSoft, fg: palette.accentStrong, border: "rgba(123,95,69,0.18)" },
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "flex-start",
  } as ViewStyle,
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    marginRight: spacing.xs,
  },
  text: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
});
