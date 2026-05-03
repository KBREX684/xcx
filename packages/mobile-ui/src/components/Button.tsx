// 主按钮：primary（CTA，琥珀填充）/ secondary（米色边框）/ ghost（无边框）/
// danger（红色填充，仅用于驳回 / 取消订阅之类的高风险动作）。loading 时禁用并替换文字。
import * as React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type ViewStyle,
} from "react-native";
import { palette, radius, spacing, fontSize, fontWeight } from "../tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm" | "lg";

export interface ButtonProps {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const styleSheet = stylesByVariant[variant];
  const sizeStyle = stylesBySize[size];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => {
        const base: ViewStyle = {
          ...styleSheet.base,
          ...sizeStyle,
        };
        if (fullWidth) base.alignSelf = "stretch";
        if (pressed && !isDisabled) {
          Object.assign(base, styleSheet.pressed);
        }
        if (isDisabled) {
          Object.assign(base, styleSheet.disabled);
        }
        return base;
      }}
    >
      {loading ? (
        <ActivityIndicator color={styleSheet.text.color} />
      ) : (
        <Text style={[styleSheet.text, { fontSize: sizeStyle.fontSize }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const baseLayout: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: "transparent",
};

const stylesBySize: Record<ButtonSize, ViewStyle & { fontSize: number }> = {
  sm: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: fontSize.body,
  },
  md: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: fontSize.bodyLg,
  },
  lg: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    fontSize: fontSize.bodyLg,
  },
};

const stylesByVariant: Record<
  ButtonVariant,
  {
    base: ViewStyle;
    pressed: ViewStyle;
    disabled: ViewStyle;
    text: { color: string; fontWeight: "600" };
  }
> = {
  primary: {
    base: {
      ...baseLayout,
      backgroundColor: palette.accent,
      shadowColor: palette.textPrimary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 2,
    },
    pressed: { backgroundColor: palette.accentStrong },
    disabled: { backgroundColor: palette.borderStrong },
    text: { color: palette.textInverse, fontWeight: fontWeight.semibold },
  },
  secondary: {
    base: {
      ...baseLayout,
      backgroundColor: palette.bgElevated,
      borderColor: palette.borderStrong,
    },
    pressed: { backgroundColor: palette.bgSubtle },
    disabled: { borderColor: palette.border, backgroundColor: palette.bgSubtle },
    text: { color: palette.textPrimary, fontWeight: fontWeight.semibold },
  },
  ghost: {
    base: { ...baseLayout, backgroundColor: "transparent" },
    pressed: { backgroundColor: palette.accentSoft },
    disabled: {},
    text: { color: palette.accentStrong, fontWeight: fontWeight.semibold },
  },
  danger: {
    base: { ...baseLayout, backgroundColor: palette.danger },
    pressed: { backgroundColor: "#8d3b30" },
    disabled: { backgroundColor: palette.borderStrong },
    text: { color: palette.textInverse, fontWeight: fontWeight.semibold },
  },
};

// 触发 tree-shaking 时保留 styles 引用
StyleSheet.create({});
