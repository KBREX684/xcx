/**
 * SearchField：胶囊搜索输入。
 *
 * 区别于普通 TextInput：默认带前缀放大镜（emoji 渲染，避免引入 SVG 依赖），
 * 圆角 pill，背景 bgSubtle，聚焦时由边框微变 accent。可选清除按钮。
 */
import * as React from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { fontSize, palette, radius, spacing } from "../tokens";
import { CloseIcon, SearchIcon } from "../icons";
import { Typography } from "./Typography";

export interface SearchFieldProps
  extends Omit<TextInputProps, "style" | "onChangeText" | "value"> {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  /** 右侧自定义节点（如"取消"按钮）。 */
  trailing?: React.ReactNode;
  containerStyle?: ViewStyle;
  /** 仅展示用（列表筛选页常见）：点击后 navigate 到搜索屏。 */
  onPressOnly?: () => void;
}

export function SearchField({
  value,
  onChangeText,
  placeholder = "搜索",
  trailing,
  containerStyle,
  onPressOnly,
  ...rest
}: SearchFieldProps) {
  const [focused, setFocused] = React.useState(false);

  if (onPressOnly) {
    return (
      <Pressable
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        onPress={onPressOnly}
        style={[styles.field, containerStyle]}
      >
        <SearchIcon size={16} color={palette.textMuted} />
        <Typography variant="body" tone="muted" style={styles.placeholder}>
          {placeholder}
        </Typography>
        {trailing}
      </Pressable>
    );
  }

  return (
    <View style={[styles.field, focused && styles.focused, containerStyle]}>
      <SearchIcon size={16} color={focused ? palette.accent : palette.textMuted} />
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="清除"
          onPress={() => onChangeText("")}
          hitSlop={8}
          style={styles.clear}
        >
          <CloseIcon size={12} color={palette.textMuted} />
        </Pressable>
      ) : null}
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    borderRadius: radius.pill,
    backgroundColor: palette.bgSubtle,
    borderWidth: 1,
    borderColor: "transparent",
  },
  focused: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.accentStrong,
  },
  placeholder: {
    flex: 1,
  },
  input: {
    flex: 1,
    fontSize: fontSize.body,
    color: palette.textPrimary,
    paddingVertical: 0,
  },
  clear: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(60,42,28,0.06)",
  },
});
