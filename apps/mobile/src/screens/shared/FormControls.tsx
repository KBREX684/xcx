import * as React from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import {
  Card,
  Typography,
  palette,
  radius,
  spacing,
} from "@agent-control-plane/mobile-ui";

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
  autoCapitalize = "none",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
}) {
  return (
    <View style={styles.field}>
      <Typography variant="caption" tone="muted" weight="medium" style={styles.label}>
        {label}
      </Typography>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        textAlignVertical={multiline ? "top" : "center"}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}

export function ChoiceChip({
  label,
  active = false,
  disabled = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Typography
        variant="caption"
        tone={active ? "accent" : "secondary"}
        weight="semibold"
        style={styles.chipText}
      >
        {label}
      </Typography>
    </Pressable>
  );
}

export function ChoiceWrap({ children }: { children: React.ReactNode }) {
  return <View style={styles.choiceWrap}>{children}</View>;
}

export function FormCard({ children }: { children: React.ReactNode }) {
  return <Card style={styles.formCard}>{children}</Card>;
}

export function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.keyValue}>
      <Typography variant="caption" tone="muted">
        {label}
      </Typography>
      {typeof value === "string" || typeof value === "number" ? (
        <Typography variant="body" weight="medium">
          {String(value)}
        </Typography>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    marginLeft: 2,
  },
  input: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: palette.textPrimary,
    backgroundColor: palette.bgSurface,
  },
  textarea: {
    minHeight: 96,
  },
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
    maxWidth: "100%",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    backgroundColor: palette.bgSurface,
  },
  chipActive: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  chipText: {
    flexShrink: 1,
  },
  pressed: {
    backgroundColor: palette.bgSubtle,
  },
  disabled: {
    opacity: 0.5,
  },
  keyValue: {
    gap: 2,
  },
});
