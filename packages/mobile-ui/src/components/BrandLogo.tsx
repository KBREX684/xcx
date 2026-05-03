/**
 * BrandLogo：与 apps/web/components/brand-mark.tsx 的 SwarmHiveIcon 视觉对齐。
 *
 * 复刻规范（参考 apps/web/app/styles/03-shell.css#brand-mark）：
 *   - hexagon tile：填充 #2a2520（brand-ink）
 *   - 三条 flow 线：描边 #b08968（brand-gold），strokeWidth 6（在 viewBox 64 中）
 *   - 三条线 opacity 分别 0.72 / 1 / 0.56
 *
 * BrandLockup：横向 logo + 中文名 / 可选英文副标，对应 web 的 sidebar / hero / compact 三档。
 */
import * as React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { palette, spacing } from "../tokens";
import { Typography } from "./Typography";

export const BRAND_NAME_CN = "蜂聚合";
export const BRAND_NAME_EN = "SwarmHive";
const BRAND_INK = "#2a2520";
const BRAND_GOLD = "#b08968";

export interface BrandLogoProps {
  /** 正方形边长，px。默认 36（约等于 web sidebar size 42 在移动端的视觉等价）。 */
  size?: number;
  /** 是否对屏幕阅读器隐藏。默认 true。 */
  decorative?: boolean;
}

export function BrandLogo({ size = 36, decorative = true }: BrandLogoProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : "蜂聚合图标"}
    >
      {/* 六边形主体：与 web brand-mark__tile 同形 */}
      <Path d="M32 4 56.2 18v28L32 60 7.8 46V18Z" fill={BRAND_INK} />
      {/* 三条暖金流向线：strokeWidth 6 与 web 完全一致 */}
      <G stroke={BRAND_GOLD} strokeWidth={6} strokeLinecap="round" fill="none">
        <Path d="M19.8 34.8 33.2 21.4" opacity={0.72} />
        <Path d="M22.8 45.2 45.2 22.8" opacity={1} />
        <Path d="M33.2 48.8 47.4 34.6" opacity={0.56} />
      </G>
    </Svg>
  );
}

export interface BrandLockupProps {
  /** sidebar：默认横向；hero：登录页大号；compact：行内极小尺寸。 */
  size?: "sidebar" | "hero" | "compact";
  /** 是否显示英文副标（如 SwarmHive）。 */
  showEnglish?: boolean;
  labelCn?: string;
  labelEn?: string;
  style?: ViewStyle;
}

export function BrandLockup({
  size = "sidebar",
  showEnglish = false,
  labelCn = BRAND_NAME_CN,
  labelEn = BRAND_NAME_EN,
  style,
}: BrandLockupProps) {
  const config =
    size === "hero"
      ? { mark: 64, gap: spacing.md, cnVariant: "display" as const }
      : size === "compact"
        ? { mark: 28, gap: spacing.sm, cnVariant: "title" as const }
        : { mark: 36, gap: spacing.sm, cnVariant: "titleLg" as const };

  return (
    <View style={[styles.lockup, { gap: config.gap }, style]}>
      <BrandLogo size={config.mark} />
      <View style={styles.copy}>
        <Typography
          variant={config.cnVariant}
          weight="semibold"
          style={styles.cn}
          numberOfLines={1}
        >
          {labelCn}
        </Typography>
        {showEnglish ? (
          <View style={styles.enRow}>
            <View style={styles.enRule} />
            <Typography variant="caption" tone="muted" style={styles.en} numberOfLines={1}>
              {labelEn.toUpperCase()}
            </Typography>
            <View style={styles.enRule} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    flexDirection: "row",
    alignItems: "center",
  },
  copy: {
    flexShrink: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  cn: {
    color: palette.textPrimary,
    letterSpacing: 0.5,
  },
  enRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  enRule: {
    width: 12,
    height: 1,
    backgroundColor: BRAND_GOLD,
    opacity: 0.74,
  },
  en: {
    letterSpacing: 1.6,
    color: BRAND_GOLD,
  },
});
