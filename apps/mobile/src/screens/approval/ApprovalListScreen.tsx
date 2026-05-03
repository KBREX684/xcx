// 审批中心 — 待我审批 / 历史。点进单条进入 ApprovalDetail。
//
// 视觉规范：
//   - 顶栏 AppBar
//   - SegmentedControl 切换待办 / 历史，待办 segment 显示 badge 数量
//   - 列表：ListItem + ApprovalsIcon leading + chevron + StatusBadge trailing（历史）
import * as React from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  AppBar,
  AppScreen,
  ApprovalsIcon,
  EmptyState,
  ListItem,
  LoadingState,
  SegmentedControl,
  StatusBadge,
  palette,
  spacing,
} from "@agent-control-plane/mobile-ui";
import { approvalService } from "../../services/controlPlaneService";
import type { RouteContext } from "../../navigation/routes";

type ApprovalTab = "pending" | "history";

export function ApprovalListScreen({ navigate, goBack }: RouteContext) {
  const [tab, setTab] = React.useState<ApprovalTab>("pending");
  const query = useQuery({
    queryKey: ["mobile.approvals"],
    queryFn: async () => {
      const result = await approvalService.fetchCenter();
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: 15_000,
  });

  const pendingCount = query.data?.pending.length ?? 0;
  const historyCount = query.data?.history.length ?? 0;

  return (
    <AppScreen padded={false}>
      <AppBar title="审批中心" onBack={goBack} />
      <View style={styles.tabsHost}>
        <SegmentedControl<ApprovalTab>
          value={tab}
          onChange={(next) => setTab(next)}
          options={[
            { value: "pending", label: "待办", badge: pendingCount },
            { value: "history", label: "历史", badge: historyCount },
          ]}
        />
      </View>

      {query.isLoading ? (
        <LoadingState label="加载审批…" />
      ) : query.isError || !query.data ? (
        <View style={styles.errorHost}>
          <EmptyState
            tone="danger"
            title="加载失败"
            description={query.error instanceof Error ? query.error.message : ""}
            actionLabel="重试"
            onAction={() => void query.refetch()}
          />
        </View>
      ) : tab === "pending" ? (
        <FlatList
          data={query.data.pending}
          keyExtractor={(item) => item.runId}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={<EmptyState title="无待办审批" description="一切都在掌握中" />}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor={palette.accent}
            />
          }
          renderItem={({ item }) => (
            <ListItem
              leading={<ApprovalsIcon size={18} color={palette.accent} />}
              title={item.taskTitle}
              subtitle={`${item.projectName} · ${item.agentName} · ${new Date(item.requestedAt).toLocaleString()}`}
              trailing={<StatusBadge label="待审批" tone="accent" />}
              onPress={() => navigate({ name: "ApprovalDetail", runId: item.runId })}
            />
          )}
        />
      ) : (
        <FlatList
          data={query.data.history}
          keyExtractor={(_, idx) => `history-${idx}`}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={<EmptyState title="暂无历史" description="完成的审批会出现在这里" />}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor={palette.accent}
            />
          }
          renderItem={({ item }) => {
            const decision = (item as { decision?: string }).decision ?? "—";
            const summary = (item as { summary?: string; runId?: string }).summary ?? "";
            const runId = (item as { runId?: string }).runId;
            const tone =
              decision === "approved" ? "success" : decision === "rejected" ? "danger" : "neutral";
            return (
              <ListItem
                leading={<ApprovalsIcon size={18} color={palette.textMuted} />}
                title={(item as { taskTitle?: string }).taskTitle ?? "审批记录"}
                subtitle={summary}
                trailing={<StatusBadge label={decision} tone={tone} />}
                onPress={runId ? () => navigate({ name: "ApprovalDetail", runId }) : undefined}
              />
            );
          }}
        />
      )}
    </AppScreen>
  );
}

function ItemSeparator() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  tabsHost: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  errorHost: {
    flex: 1,
  },
  list: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.border,
    marginHorizontal: spacing.md,
  },
});
