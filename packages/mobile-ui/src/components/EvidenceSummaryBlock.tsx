// 证据摘要块：展示 EvidenceSummary 的事件 / Run / 证书三段式。可在审批详情、Run 详情、
// 证书详情中复用。仅渲染只读视图，禁止内部触发任何写操作。
import * as React from "react";
import { StyleSheet, View } from "react-native";
import type { MobileEvidenceSummary } from "@agent-control-plane/domain";
import { palette, spacing } from "../tokens";
import { Card } from "./Card";
import { StatusBadge, type StatusTone } from "./StatusBadge";
import { Typography } from "./Typography";

export interface EvidenceSummaryBlockProps {
  summary: MobileEvidenceSummary | null;
  /** 是否折叠次要事件，默认 false 全部显示。 */
  compact?: boolean;
}

const TRUST_TONE: Record<string, StatusTone> = {
  trusted: "success",
  pending: "info",
  warning: "warning",
  broken: "danger",
  unknown: "neutral",
};

export function EvidenceSummaryBlock({ summary, compact = false }: EvidenceSummaryBlockProps) {
  if (!summary) {
    return (
      <Card>
        <Typography variant="title">证据链</Typography>
        <Typography variant="body" tone="muted" style={styles.gap}>
          暂无证据数据
        </Typography>
      </Card>
    );
  }

  const trustTone = TRUST_TONE[summary.trustState] ?? "neutral";
  const events = compact ? summary.events.slice(0, 3) : summary.events;

  return (
    <Card>
      <View style={styles.header}>
        <Typography variant="title">证据链</Typography>
        <StatusBadge label={`信任：${summary.trustState}`} tone={trustTone} dot />
      </View>

      <View style={styles.section}>
        <Typography variant="caption" tone="muted">
          事件 ({summary.events.length})
        </Typography>
        {events.length === 0 ? (
          <Typography variant="body" tone="muted">
            无事件
          </Typography>
        ) : (
          events.map((evt) => (
            <View key={evt.id} style={styles.row}>
              <Typography variant="body" weight="medium">
                {evt.eventType}
              </Typography>
              <Typography variant="caption" tone="muted">
                {formatTime(evt.occurredAt)} · trace {short(evt.traceId)}
              </Typography>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Typography variant="caption" tone="muted">
          Runs ({summary.runs.length})
        </Typography>
        {summary.runs.map((run) => (
          <View key={run.id} style={styles.row}>
            <Typography variant="body" weight="medium">
              {run.taskTitle}
            </Typography>
            <Typography variant="caption" tone="muted">
              {run.agentName} · {run.status} {run.nonceLedgerFound ? "· nonce ✓" : ""}
            </Typography>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Typography variant="caption" tone="muted">
          证书 ({summary.certificates.length})
        </Typography>
        {summary.certificates.map((cert) => (
          <View key={cert.id} style={styles.row}>
            <Typography variant="body" weight="medium">
              {cert.certificateNo}
            </Typography>
            <Typography variant="caption" tone="muted">
              {cert.status} · 摘要 {short(cert.digestSha256)}
            </Typography>
          </View>
        ))}
      </View>
    </Card>
  );
}

function short(s: string): string {
  if (!s) return "";
  return s.length <= 12 ? s : `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function formatTime(s: string): string {
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString();
  } catch {
    return s;
  }
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  section: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    paddingTop: spacing.sm,
  },
  row: {
    marginTop: spacing.xs,
  },
  gap: {
    marginTop: spacing.sm,
  },
});
