// 整页容器：保留安全区，填充 Claude 暖白米背景。所有屏幕都应该用 AppScreen 包裹，
// 避免重复处理 statusBar / safeAreaInsets。
import * as React from "react";
import { ScrollView, StatusBar, StyleSheet, View, type ViewStyle } from "react-native";
import { palette, spacing } from "../tokens";

export interface AppScreenProps {
  children: React.ReactNode;
  /** 是否使用 ScrollView 包裹内容；表单页与列表页 false。 */
  scrollable?: boolean;
  /** 透传到外层 View。 */
  style?: ViewStyle;
  /** 是否带左右内边距，默认 true；列表页传 false 自行控制。 */
  padded?: boolean;
  testID?: string;
}

export function AppScreen({ children, scrollable = false, style, padded = true, testID }: AppScreenProps) {
  const innerStyle: ViewStyle[] = [styles.inner];
  if (padded) innerStyle.push(styles.padded);
  if (style) innerStyle.push(style);

  if (scrollable) {
    return (
      <View style={styles.root} testID={testID}>
        <StatusBar barStyle="dark-content" backgroundColor={palette.bgPrimary} />
        <ScrollView
          contentContainerStyle={innerStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root} testID={testID}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.bgPrimary} />
      <View style={innerStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgPrimary,
  },
  inner: {
    flexGrow: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
});
