// 空态/错误态/加载态统一占位。EmptyState 仅描述与可选动作；具体重试逻辑由调用方传入。
import * as React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { palette, spacing } from "../tokens";
import { Button } from "./Button";
import { Typography } from "./Typography";

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "neutral" | "danger";
  testID?: string;
}

export function EmptyState({ title, description, actionLabel, onAction, tone = "neutral", testID }: EmptyStateProps) {
  return (
    <View style={styles.container} testID={testID}>
      <Typography variant="title" tone={tone === "danger" ? "danger" : "primary"} align="center">
        {title}
      </Typography>
      {description ? (
        <Typography variant="body" tone="secondary" align="center" style={styles.desc}>
          {description}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} variant="secondary" onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={palette.accent} />
      {label ? (
        <Typography variant="caption" tone="muted" style={styles.desc}>
          {label}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  desc: {
    marginTop: spacing.sm,
  },
  action: {
    marginTop: spacing.lg,
  },
});
