// 文字层级：Title / Subtitle / Body / Caption / Mono。所有页面禁止裸 <Text> 写 fontSize。
import * as React from "react";
import { StyleSheet, Text, type TextProps as RNTextProps, type TextStyle } from "react-native";
import { fontSize, fontWeight, lineHeight, palette } from "../tokens";

export interface TypographyProps extends RNTextProps {
  variant?: "display" | "titleLg" | "title" | "bodyLg" | "body" | "caption" | "mono";
  tone?: "primary" | "secondary" | "muted" | "danger" | "accent" | "inverse";
  weight?: "regular" | "medium" | "semibold" | "bold";
  align?: "auto" | "left" | "right" | "center";
}

export function Typography({
  variant = "body",
  tone = "primary",
  weight,
  align,
  style,
  ...rest
}: TypographyProps) {
  const variantStyle = STYLES[variant];
  const flat: TextStyle = {
    color: TONE_COLOR[tone],
    fontSize: variantStyle.fontSize,
    lineHeight: variantStyle.lineHeight,
    fontWeight: weight ? FONT_WEIGHT[weight] : variantStyle.fontWeight,
  };
  if (align) flat.textAlign = align;
  if (variant === "mono") flat.fontFamily = "Menlo";
  return <Text {...rest} style={[flat, style]} />;
}

const TONE_COLOR: Record<NonNullable<TypographyProps["tone"]>, string> = {
  primary: palette.textPrimary,
  secondary: palette.textSecondary,
  muted: palette.textMuted,
  danger: palette.danger,
  accent: palette.accentStrong,
  inverse: palette.textInverse,
};

const FONT_WEIGHT: Record<NonNullable<TypographyProps["weight"]>, TextStyle["fontWeight"]> = {
  regular: fontWeight.regular,
  medium: fontWeight.medium,
  semibold: fontWeight.semibold,
  bold: fontWeight.bold,
};

const STYLES: Record<
  NonNullable<TypographyProps["variant"]>,
  { fontSize: number; lineHeight: number; fontWeight: TextStyle["fontWeight"] }
> = {
  display: { fontSize: fontSize.display, lineHeight: lineHeight.display, fontWeight: fontWeight.bold },
  titleLg: { fontSize: fontSize.titleLg, lineHeight: lineHeight.titleLg, fontWeight: fontWeight.semibold },
  title: { fontSize: fontSize.title, lineHeight: lineHeight.title, fontWeight: fontWeight.semibold },
  bodyLg: { fontSize: fontSize.bodyLg, lineHeight: lineHeight.bodyLg, fontWeight: fontWeight.regular },
  body: { fontSize: fontSize.body, lineHeight: lineHeight.body, fontWeight: fontWeight.regular },
  caption: { fontSize: fontSize.caption, lineHeight: lineHeight.caption, fontWeight: fontWeight.regular },
  mono: { fontSize: fontSize.body, lineHeight: lineHeight.body, fontWeight: fontWeight.regular },
};

// 让 StyleSheet 引用以避免 dead-code 删除警告
StyleSheet.create({});
