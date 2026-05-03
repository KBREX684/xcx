// 收件箱详情：从列表选中一条后展示完整摘要并提供动作。
// 不重复请求列表；从 react-query 缓存或 props 取数。
import * as React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  AppBar,
  AppScreen,
  Button,
  Card,
  EmptyState,
  StatusBadge,
  Typography,
  haptic,
  spacing,
  toast,
} from "@agent-control-plane/mobile-ui";
import type { MobileInboxItem } from "@agent-control-plane/domain/src/mobile";
import { inboxService } from "../../services/inboxService";
import { useAuth } from "../../state/AuthContext";
import type { Route, RouteContext } from "../../navigation/routes";

export function InboxDetailScreen({ itemId, ctx }: { itemId: string; ctx: RouteContext }) {
  const auth = useAuth();
  const memberId = auth.session?.memberId ?? "anonymous";
  const qc = useQueryClient();

  const item = findItemInCache(qc, memberId, itemId);

  if (!item) {
    return (
      <AppScreen>
        <AppBar title="消息详情" onBack={ctx.goBack} />
        <EmptyState
          title="消息已不可用"
          description="返回收件箱重新刷新"
          actionLabel="返回"
          onAction={ctx.goBack}
        />
      </AppScreen>
    );
  }

  const handleOpenSource = async () => {
    if (item.unread) {
      await inboxService.markRead([item.id]);
      void qc.invalidateQueries({ queryKey: ["mobile.inbox", memberId] });
    }
    const route = mapInboxToRoute(item);
    if (route) ctx.navigate(route);
    else toast.warn("此类型暂不支持移动端跳转，请到 Web 端处理");
  };

  const handleArchive = async () => {
    const res = await inboxService.archive([item.id]);
    if (res.ok) {
      haptic.weak();
      toast.success("已归档");
      void qc.invalidateQueries({ queryKey: ["mobile.inbox", memberId] });
      ctx.goBack();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleMarkRead = async () => {
    if (!item.unread) return;
    const res = await inboxService.markRead([item.id]);
    if (res.ok) {
      toast.success("已标记为已读");
      void qc.invalidateQueries({ queryKey: ["mobile.inbox", memberId] });
    } else {
      toast.error(res.error.message);
    }
  };

  return (
    <AppScreen padded={false}>
      <AppBar title="消息详情" onBack={ctx.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <View style={styles.header}>
            <Typography variant="title" weight="semibold">
              {item.title}
            </Typography>
            <StatusBadge label={item.kind} tone="neutral" />
          </View>
          <Typography variant="body" tone="secondary" style={styles.subtitle}>
            {item.subtitle}
          </Typography>
          <Typography variant="caption" tone="muted">
            {new Date(item.createdAt).toLocaleString()}
          </Typography>
          {item.status ? (
            <Typography variant="caption" tone="muted">
              当前状态 {item.status}
            </Typography>
          ) : null}
        </Card>

        <Card>
          <Typography variant="caption" tone="muted" weight="semibold" style={styles.sectionLabel}>
            正文
          </Typography>
          <Typography variant="body" selectable style={styles.messageBody}>
            {item.body?.trim() || item.subtitle}
          </Typography>
        </Card>

        <View style={styles.actions}>
          <Button label="打开来源" variant="primary" onPress={handleOpenSource} />
          {item.unread ? <Button label="标记已读" variant="ghost" onPress={handleMarkRead} /> : null}
          {!item.archived ? <Button label="归档" variant="ghost" onPress={handleArchive} /> : null}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

function findItemInCache(
  qc: ReturnType<typeof useQueryClient>,
  memberId: string,
  itemId: string,
): MobileInboxItem | null {
  // 在所有 inbox 查询缓存中查找最早匹配的一条
  const queries = qc.getQueriesData<{ items: MobileInboxItem[] }>({
    queryKey: ["mobile.inbox", memberId],
  });
  for (const [, data] of queries) {
    if (!data) continue;
    const found = data.items.find((it) => it.id === itemId);
    if (found) return found;
  }
  return null;
}

/** 把 inbox 项映射到移动端可达的 Route；不可识别返回 null，UI 层提示去 Web 处理。 */
function mapInboxToRoute(item: MobileInboxItem): Route | null {
  // href 形如 /projects/:id/runs/:runId 或 /approvals/:runId 等。
  // 优先按 kind 分发；href 解析仅作 fallback。
  const kind = item.kind as string;
  switch (kind) {
    case "approval":
    case "approval_pending":
    case "approval_due": {
      const runId = matchSegment(item.href, /\/(?:approvals|runs)\/([^/?#]+)/);
      if (runId) return { name: "ApprovalDetail", runId };
      break;
    }
    case "failure":
    case "run_failed":
    case "run_completed": {
      const runId = matchSegment(item.href, /\/runs\/([^/?#]+)/);
      if (runId) return { name: "RunDetail", runId };
      break;
    }
    case "proof_exception":
    case "evidence":
    case "evidence_failed": {
      const runId = matchSegment(item.href, /\/runs\/([^/?#]+)/);
      if (runId) return { name: "RunDetail", runId };
      break;
    }
    case "mention":
    case "assignment": {
      const taskId = matchSegment(item.href, /\/tasks\/([^/?#]+)/);
      if (taskId) return { name: "TaskDetail", taskId };
      const projectId = matchSegment(item.href, /\/projects\/([^/?#]+)/);
      if (projectId) return { name: "ProjectOverview", projectId };
      break;
    }
    default:
      break;
  }
  return null;
}

function matchSegment(href: string, re: RegExp): string | null {
  const m = href.match(re);
  return m && m[1] ? decodeURIComponent(m[1]) : null;
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  subtitle: { marginBottom: spacing.sm },
  sectionLabel: { marginBottom: spacing.sm },
  messageBody: { lineHeight: 24 },
  actions: { gap: spacing.sm },
});
