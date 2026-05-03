// 审批详情：展示证据摘要 + 通过 / 驳回操作（带原因输入）。
// 提交带 clientRequestId，后端 IdempotencyLedger 防重复。
import * as React from "react";
import { Alert, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AppBar,
  AppScreen,
  Button,
  Card,
  EmptyState,
  EvidenceSummaryBlock,
  LoadingState,
  Typography,
  haptic,
  palette,
  radius,
  spacing,
  toast,
} from "@agent-control-plane/mobile-ui";
import { createMobileClientRequestId } from "@agent-control-plane/domain/src/mobile";
import { approvalService } from "../../services/controlPlaneService";
import { telemetryClient } from "../../telemetry/telemetryClient";
import type { RouteContext } from "../../navigation/routes";

export function ApprovalDetailScreen({ runId, ctx }: { runId: string; ctx: RouteContext }) {
  const qc = useQueryClient();
  const evidenceQuery = useQuery({
    queryKey: ["mobile.approval.evidence", runId],
    queryFn: async () => {
      const r = await approvalService.fetchEvidence(runId);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState<"approve" | "reject" | null>(null);
  // clientRequestId 在 mount 时生成；同一个 runId 在 retry 时复用，确保后端幂等
  const requestIdRef = React.useRef<string>(createMobileClientRequestId("approval"));

  const handleDecision = (decision: "approve" | "reject") => {
    if (submitting) return;
    if (decision === "reject" && !comment.trim()) {
      Alert.alert("提示", "驳回需要填写理由");
      return;
    }
    Alert.alert(decision === "approve" ? "确认通过？" : "确认驳回？", "操作不可撤销", [
      { text: "取消", style: "cancel" },
      {
        text: "确认",
        style: decision === "reject" ? "destructive" : "default",
        onPress: async () => {
          setSubmitting(decision);
          try {
            const fn = decision === "approve" ? approvalService.approve : approvalService.reject;
            const result = await fn(runId, {
              comment: comment.trim() || undefined,
              clientRequestId: requestIdRef.current,
            });
            if (!result.ok) {
              void telemetryClient.track("approval_failed", {
                outcome: "error",
                attrs: { decision, reason: result.error.code },
              });
              haptic.warn();
              toast.error(result.error.message);
              return;
            }
            void telemetryClient.track("approval_decided", { attrs: { decision } });
            haptic.weak();
            toast.success(decision === "approve" ? "已通过审批" : "已驳回");
            await qc.invalidateQueries({ queryKey: ["mobile.approvals"] });
            ctx.goBack();
          } finally {
            setSubmitting(null);
          }
        },
      },
    ]);
  };

  return (
    <AppScreen padded={false}>
      <AppBar title="审批详情" subtitle={`Run ${runId.slice(-8)}`} onBack={ctx.goBack} />
      {evidenceQuery.isLoading ? (
        <LoadingState label="加载证据…" />
      ) : evidenceQuery.isError ? (
        <EmptyState
          tone="danger"
          title="加载失败"
          description={evidenceQuery.error instanceof Error ? evidenceQuery.error.message : ""}
          actionLabel="重试"
          onAction={() => void evidenceQuery.refetch()}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <EvidenceSummaryBlock summary={evidenceQuery.data ?? null} />
          <Card style={{ marginTop: spacing.lg }}>
            <Typography variant="title" weight="semibold">
              审批意见
            </Typography>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="可选；驳回时必填，最长 500 字"
              placeholderTextColor={palette.textMuted}
              multiline
              maxLength={500}
              style={styles.input}
            />
            <Typography variant="caption" tone="muted" align="right">
              {comment.length}/500
            </Typography>
            <View style={styles.actions}>
              <Button
                label="驳回"
                variant="danger"
                onPress={() => handleDecision("reject")}
                loading={submitting === "reject"}
                disabled={submitting !== null}
              />
              <Button
                label="通过"
                onPress={() => handleDecision("approve")}
                loading={submitting === "approve"}
                disabled={submitting !== null}
              />
            </View>
          </Card>
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  input: {
    marginTop: spacing.sm,
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    padding: spacing.sm,
    color: palette.textPrimary,
    backgroundColor: palette.bgSurface,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
