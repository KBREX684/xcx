/**
 * ListItem：通用列表行（首页主功能入口、设置项、收件箱、项目列表均可复用）。
 *
 * 结构：[leading] · [title + subtitle + meta] · [trailing / chevron]
 *
 * 设计原则（取自 Claude 风格 + Linear 精准）：
 *   - 默认无边框，仅靠 1px hairline 分割（嵌入 Card 内可去分割线）。
 *   - 命中区高度 ≥ 56，符合 a11y。
 *   - pressed 态用 bgSubtle 替代涟漪，避免 Material 风格的圆形扩散。
 */
import * as React from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { palette, radius, spacing } from "../tokens";
import { ChevronRightIcon } from "../icons";
import { Typography } from "./Typography";

export interface ListItemProps {
  title: string;
  subtitle?: string;
  /** 右上角次级文本（如时间戳）。 */
  meta?: string;
  /** 左侧自定义节点（图标 / 头像 / 装饰圆点）。 */
  leading?: React.ReactNode;
  /** 右侧自定义节点（StatusBadge / 数值）。 */
  trailing?: React.ReactNode;
  titleLines?: number;
  subtitleLines?: number;
  /** 是否显示右侧 chevron。trailing 与 chevron 互斥，trailing 优先。 */
  chevron?: boolean;
  /** 是否在底部画 hairline 分隔线（用于裸列表，Card 内传 false）。 */
  divider?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** 危险动作风格（标题红色） */
  destructive?: boolean;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}

export function ListItem({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  titleLines = 2,
  subtitleLines = 2,
  chevron = false,
  divider = false,
  onPress,
  disabled = false,
  destructive = false,
  style,
  testID,
  accessibilityLabel,
}: ListItemProps) {
  const Body = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Typography
            variant="bodyLg"
            weight="medium"
            tone={destructive ? "danger" : "primary"}
            numberOfLines={titleLines}
            style={styles.title}
          >
            {title}
          </Typography>
          {meta ? (
            <Typography variant="caption" tone="muted" numberOfLines={1}>
              {meta}
            </Typography>
          ) : null}
        </View>
        {subtitle ? (
          <Typography variant="caption" tone="muted" numberOfLines={subtitleLines} style={styles.subtitle}>
            {subtitle}
          </Typography>
        ) : null}
      </View>
      {trailing ? (
        <View style={styles.trailing}>{trailing}</View>
      ) : chevron ? (
        <View style={styles.chevron}>
          <ChevronRightIcon size={18} color={palette.textMuted} />
        </View>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View testID={testID} style={[styles.row, divider && styles.divider, style]}>
        {Body}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: palette.bgSubtle, borderless: false }}
      style={({ pressed }) => [
        styles.row,
        divider && styles.divider,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {Body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  pressed: {
    backgroundColor: palette.accentSoft,
  },
  disabled: {
    opacity: 0.5,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
    borderRadius: 0,
  },
  leading: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.accentSoft,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    marginTop: 2,
  },
  trailing: {
    marginLeft: spacing.xs,
    flexShrink: 0,
    maxWidth: 112,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
});
