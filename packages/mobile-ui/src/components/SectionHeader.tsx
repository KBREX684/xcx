/**
 * SectionHeader：页面分组标题。
 *
 * 设计取自参考图：小写 eyebrow + 大字标题 + 右侧"更多"动作。
 * 比 Card 内嵌 <Typography variant="title"> 提供更克制的层级，
 * 适合 HomeScreen / 详情页 / 设置页的多分组场景。
 */
import * as React from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { palette, spacing } from "../tokens";
import { Typography } from "./Typography";

export interface SectionHeaderProps {
  title: string;
  /** 顶部小写说明字（eyebrow），可选。 */
  eyebrow?: string;
  /** 右侧动作文字，与 onAction 配合使用。 */
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
  /** 紧凑模式：去掉 eyebrow + 减小垂直间距，用于卡内分组。 */
  compact?: boolean;
}

export function SectionHeader({
  title,
  eyebrow,
  actionLabel,
  onAction,
  style,
  compact = false,
}: SectionHeaderProps) {
  return (
    <View style={[compact ? styles.compactRoot : styles.root, style]}>
      <View style={styles.titles}>
        {!compact && eyebrow ? (
          <Typography
            variant="caption"
            tone="muted"
            weight="medium"
            style={styles.eyebrow}
          >
            {eyebrow.toUpperCase()}
          </Typography>
        ) : null}
        <Typography
          variant={compact ? "body" : "title"}
          weight="semibold"
          numberOfLines={1}
        >
          {title}
        </Typography>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => [
            styles.action,
            pressed && { backgroundColor: palette.bgSubtle },
          ]}
        >
          <Typography variant="caption" tone="accent" weight="medium">
            {actionLabel}
          </Typography>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  compactRoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  titles: {
    flex: 1,
  },
  eyebrow: {
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  action: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
});
