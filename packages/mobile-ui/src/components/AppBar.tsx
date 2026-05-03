// 公共顶部 AppBar：支持返回按钮、标题、右侧动作。
import * as React from "react";
import { Platform, Pressable, StatusBar, StyleSheet, View, type ViewStyle } from "react-native";
import { palette, radius, spacing } from "../tokens";
import { ChevronLeftIcon } from "../icons";
import { Typography } from "./Typography";

export interface AppBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  style?: ViewStyle;
}

export function AppBar({ title, subtitle, onBack, right, style }: AppBarProps) {
  const topInset = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

  return (
    <View style={[styles.bar, topInset > 0 && { height: styles.bar.height + topInset, paddingTop: topInset }, style]}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="返回"
            onPress={onBack}
            hitSlop={8}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { backgroundColor: palette.bgSubtle },
            ]}
          >
            <ChevronLeftIcon size={20} color={palette.textPrimary} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.center}>
        <Typography variant="title" align="center" numberOfLines={1}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" tone="muted" align="center" numberOfLines={1}>
            {subtitle}
          </Typography>
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    backgroundColor: palette.bgPrimary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  left: {
    width: 60,
    alignItems: "flex-start",
  },
  center: {
    flex: 1,
  },
  right: {
    width: 60,
    alignItems: "flex-end",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
});
