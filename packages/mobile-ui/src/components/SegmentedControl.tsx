/**
 * SegmentedControl：用于"待审批 / 历史"、"项目 / 任务"等二/三段切换。
 *
 * 取自参考图的胶囊分段：底色 bgSubtle，选中段填充 bgSurface + 微阴影 +
 * 文字 accentStrong。零动画时也能一眼区分；如需动画，给选中段加 200ms 渐变。
 */
import * as React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type ViewStyle,
} from "react-native";
import { palette, radius, shadow, spacing } from "../tokens";
import { Typography } from "./Typography";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  /** 右上角小数字徽标（待审批数等）。 */
  badge?: number | string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: ReadonlyArray<SegmentedControlOption<T>>;
  value: T;
  onChange: (next: T, e: GestureResponderEvent) => void;
  fullWidth?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  fullWidth = true,
  style,
  testID,
}: SegmentedControlProps<T>) {
  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      style={[styles.track, fullWidth && styles.fullWidth, style]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            onPress={(e) => {
              if (!active) onChange(opt.value, e);
            }}
            hitSlop={4}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Typography
              variant="caption"
              weight={active ? "semibold" : "medium"}
              tone={active ? "accent" : "secondary"}
              numberOfLines={1}
            >
              {opt.label}
            </Typography>
            {opt.badge !== undefined && opt.badge !== 0 && opt.badge !== "0" ? (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Typography
                  variant="caption"
                  tone={active ? "accent" : "secondary"}
                  weight="semibold"
                  style={styles.badgeText}
                >
                  {String(opt.badge)}
                </Typography>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: palette.bgSunken,
    padding: 4,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
    gap: 2,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 74,
    minHeight: 40,
  },
  segmentActive: {
    backgroundColor: palette.bgElevated,
    ...shadow.card,
  },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(45,38,30,0.09)",
  },
  badgeActive: {
    backgroundColor: palette.accentSoft,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
});
