// KPI 卡片：用于 Agent 详情 / 首页指标块。强调主数值 + 辅助说明。
// 设计：60% 内容（数值大字）/ 30% 上下文（标题、副标题）/ 10% 状态（更新时间或趋势）。
import * as React from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { palette, radius, spacing, fontSize, fontWeight, lineHeight } from "../tokens";
import { Typography } from "./Typography";

export interface KpiCardProps {
  label: string;
  /** 主数值，必传。数字会被自动转字符串。数据缺失时上层应传 "—"。 */
  value: string | number;
  /** 副标题 / 单位 / 备注。可选。 */
  hint?: string;
  /** 状态色，影响数值颜色。default=textPrimary。 */
  tone?: "default" | "accent" | "success" | "warning" | "danger" | "info";
  /** 更新时间或来源，灰字。 */
  footnote?: string;
  /** 可选点击：按下后跳转详情。 */
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

const TONE_TO_COLOR: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: palette.textPrimary,
  accent: palette.accent,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  info: palette.info,
};

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
  footnote,
  onPress,
  style,
  testID,
}: KpiCardProps) {
  const inner = (
    <>
      <Typography variant="caption" tone="muted">
        {label}
      </Typography>
      <View style={styles.valueRow}>
        <Typography variant="titleLg" weight="semibold" style={{ color: TONE_TO_COLOR[tone] }}>
          {String(value)}
        </Typography>
        {hint ? (
          <Typography variant="caption" tone="muted" style={{ marginLeft: spacing.xs }}>
            {hint}
          </Typography>
        ) : null}
      </View>
      {footnote ? (
        <Typography variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
          {footnote}
        </Typography>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${String(value)}`}
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && { backgroundColor: palette.bgSubtle }, style]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={[styles.card, style]}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: palette.bgSurface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  } as ViewStyle,
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: spacing.xs,
  },
});

// 组合容器：将多个 KpiCard 横向并排，自动 wrap。
export function KpiGrid({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[gridStyles.grid, style]}>{children}</View>;
}

const gridStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});

// 仅为 lint 静默；fontSize/fontWeight/lineHeight 由 Typography 间接复用。
void fontSize;
void fontWeight;
void lineHeight;
