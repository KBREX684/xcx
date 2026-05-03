// 内容卡片：圆角 + 1px 边 + 极弱阴影。所有列表项 / 详情区段都用 Card。
import * as React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { palette, radius, shadow, spacing } from "../tokens";

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** elevated=true 给详情页强调卡片使用更明显的阴影。 */
  elevated?: boolean;
  testID?: string;
}

export function Card({ children, style, elevated = false, testID }: CardProps) {
  return (
    <View testID={testID} style={[styles.base, elevated ? shadow.raised : shadow.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: palette.bgElevated,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.lg,
  } as ViewStyle,
});
