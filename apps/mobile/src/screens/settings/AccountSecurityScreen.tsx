// 账户安全：列出当前 member 的会话/设备，支持单条 revoke 与一键退出其他设备。
// 不展示 token 内容；只展示 ip、ua、最后活跃时间。
// "退出其他设备" = 遍历 sessions 中 current=false 的项串行 revoke。
import * as React from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AppBar,
  AppScreen,
  Button,
  Card,
  EmptyState,
  LoadingState,
  StatusBadge,
  Typography,
  spacing,
  toast,
} from "@agent-control-plane/mobile-ui";
import { sessionService, type SessionItem } from "../../services/sessionService";
import type { RouteContext } from "../../navigation/routes";

export function AccountSecurityScreen({ goBack }: RouteContext) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["mobile.sessions"],
    queryFn: async () => {
      const result = await sessionService.list();
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: 30_000,
  });

  const revokeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await sessionService.revoke(sessionId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      toast.success("已退出该设备");
      void qc.invalidateQueries({ queryKey: ["mobile.sessions"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeAllOthersMutation = useMutation({
    mutationFn: async () => {
      const sessions = query.data ?? [];
      const others = sessions.filter((s) => !s.current);
      // 串行执行，避免一次并发风暴；任一失败抛出第一条错误
      for (const s of others) {
        const res = await sessionService.revoke(s.id);
        if (!res.ok) throw new Error(res.error.message);
      }
      return others.length;
    },
    onSuccess: (count) => {
      toast.success(`已退出 ${count} 台其他设备`);
      void qc.invalidateQueries({ queryKey: ["mobile.sessions"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sessions = query.data ?? [];
  const otherCount = sessions.filter((s) => !s.current).length;

  if (query.isLoading) {
    return (
      <AppScreen>
        <AppBar title="账户安全" onBack={goBack} />
        <LoadingState label="加载会话…" />
      </AppScreen>
    );
  }

  return (
    <AppScreen padded={false}>
      <AppBar title="账户安全" onBack={goBack} />
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !query.isLoading}
            onRefresh={() => void query.refetch()}
          />
        }
        ListHeaderComponent={
          <View style={styles.summary}>
            <Typography variant="caption" tone="muted">
              共 {sessions.length} 台设备登录中
            </Typography>
            {otherCount > 0 ? (
              <Button
                label={`退出其他 ${otherCount} 台设备`}
                variant="ghost"
                onPress={() => revokeAllOthersMutation.mutate()}
                disabled={revokeAllOthersMutation.isPending}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.isError ? (
            <EmptyState
              tone="danger"
              title="加载失败"
              description={query.error instanceof Error ? query.error.message : "请检查网络"}
              actionLabel="重试"
              onAction={() => void query.refetch()}
            />
          ) : (
            <EmptyState title="暂无设备会话" />
          )
        }
        renderItem={({ item }) => (
          <SessionRow
            item={item}
            onRevoke={() => revokeMutation.mutate(item.id)}
            disabled={revokeMutation.isPending}
          />
        )}
      />
    </AppScreen>
  );
}

function SessionRow({ item, onRevoke, disabled }: { item: SessionItem; onRevoke: () => void; disabled: boolean }) {
  const isCurrent = !!item.current;
  return (
    <Card style={styles.row}>
      <View style={styles.rowHeader}>
        <Typography variant="body" weight="semibold" numberOfLines={1}>
          {item.userAgent ?? "未知设备"}
        </Typography>
        {isCurrent ? <StatusBadge label="当前设备" tone="success" /> : null}
      </View>
      {item.ip ? (
        <Typography variant="caption" tone="muted">
          IP {item.ip}
        </Typography>
      ) : null}
      {item.lastActiveAt ? (
        <Typography variant="caption" tone="muted">
          最近活跃 {new Date(item.lastActiveAt).toLocaleString()}
        </Typography>
      ) : null}
      {!isCurrent ? (
        <View style={styles.rowAction}>
          <Pressable
            onPress={onRevoke}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="退出该设备"
          >
            <Typography variant="caption" tone="accent" weight="semibold">
              退出该设备
            </Typography>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summary: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  row: { padding: spacing.md, marginBottom: spacing.sm },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  rowAction: {
    marginTop: spacing.sm,
    alignItems: "flex-end",
  },
});
