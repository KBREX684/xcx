// 首页：聚合卡片 + 待审批 / 异常 Run / 证据告警 / 收件箱未读 + 跳转。
// 视觉规范（80% Claude DNA / 20% Linear DNA）：
//   - 顶部 hero：display 标题 + 灰色生成时间 + 胶囊搜索入口
//   - KPI 4 宫格：KpiCard（强调色按 tone 区分）
//   - 三段分组：SectionHeader + ListItem，零硬阴影、靠 hairline 划分层级
import * as React from "react";
import { RefreshControl, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  ApprovalsIcon,
  AppScreen,
  BotIcon,
  BrandLockup,
  EmptyState,
  FolderIcon,
  KpiCard,
  KpiGrid,
  ListItem,
  LoadingState,
  SearchField,
  SectionHeader,
  StatusBadge,
  Typography,
  palette,
  radius,
  spacing,
} from "@agent-control-plane/mobile-ui";
import { homeService } from "../../services/controlPlaneService";
import type { RouteContext } from "../../navigation/routes";
import { telemetryClient } from "../../telemetry/telemetryClient";
import { consumeFirstScreenMark } from "../../telemetry/appStartMark";
import { useAuth } from "../../state/AuthContext";
import { t } from "../../i18n/strings";

export function HomeScreen({ navigate }: RouteContext) {
  const { session } = useAuth();
  const memberId = session?.memberId;
  const query = useQuery({
    queryKey: ["mobile.home", memberId],
    queryFn: async () => {
      const result = await homeService.fetchHome(memberId);
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: 30_000,
  });

  React.useEffect(() => {
    if (!query.data) return;
    const durationMs = consumeFirstScreenMark();
    if (durationMs === null || durationMs === undefined) return;
    // L-CODE-10：把"非首屏关键"的 telemetry 上报推迟到交互空闲后，避免与首屏渲染争抢主线程。
    const handle = setTimeout(() => {
      void telemetryClient.track("app_first_screen", {
        route: "Home",
        durationMs,
      });
    }, 0);
    return () => {
      clearTimeout(handle);
    };
  }, [query.data]);

  const refreshing = query.isFetching && !query.isLoading;

  if (query.isLoading) {
    return (
      <AppScreen>
        <LoadingState label={t("home.loading")} />
      </AppScreen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <AppScreen>
        <EmptyState
          tone="danger"
          title={t("home.loadFailed")}
          description={query.error instanceof Error ? query.error.message : t("home.checkNetwork")}
          actionLabel={t("common.retry")}
          onAction={() => void query.refetch()}
        />
      </AppScreen>
    );
  }

  const {
    pendingApprovalCount,
    failingRunsCount,
    evidenceExceptionCount,
    unreadInboxCount,
    topApprovals,
    topProjects,
    watchAgents,
  } = query.data;

  const generatedAtLabel = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(query.data.generatedAt));

  return (
    <AppScreen padded={false}>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void query.refetch()}
            tintColor={palette.accent}
          />
        }
      >
        <View style={styles.hero}>
          <BrandLockup size="compact" showEnglish={false} />
          <Typography variant="caption" tone="muted" style={styles.heroTime}>
            更新 {generatedAtLabel}
          </Typography>
        </View>

        <SearchField
          value=""
          onChangeText={() => undefined}
          placeholder="搜索任务、项目、Run、证据"
          onPressOnly={() => navigate({ name: "Search" })}
          containerStyle={styles.search}
        />

        <KpiGrid style={styles.kpis}>
          <KpiCard
            label="待我审批"
            value={pendingApprovalCount}
            tone="accent"
            onPress={() => navigate({ name: "ApprovalList" })}
          />
          <KpiCard label="异常 Run" value={failingRunsCount} tone="danger" />
          <KpiCard label="证据告警" value={evidenceExceptionCount} tone="warning" />
          <KpiCard
            label="未读消息"
            value={unreadInboxCount}
            tone="info"
            onPress={() => navigate({ name: "Inbox" })}
          />
        </KpiGrid>

        <View style={styles.section}>
          <SectionHeader
            eyebrow="approvals"
            title="待我审批"
            actionLabel="查看更多"
            onAction={() => navigate({ name: "ApprovalList" })}
          />
          {topApprovals.length === 0 ? (
            <View style={styles.emptyTile}>
              <Typography variant="body" tone="muted">
                全部已处理
              </Typography>
            </View>
          ) : (
            <View style={styles.list}>
              {topApprovals.map((item, idx) => (
                <ListItem
                  key={item.runId}
                  leading={<ApprovalsIcon size={18} color={palette.accent} />}
                  title={item.taskTitle}
                  subtitle={`${item.projectName} · ${item.agentName}`}
                  chevron
                  divider={idx < topApprovals.length - 1}
                  onPress={() => navigate({ name: "ApprovalDetail", runId: item.runId })}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader
            eyebrow="projects"
            title="我的项目"
            actionLabel="查看更多"
            onAction={() => navigate({ name: "ProjectList" })}
          />
          <View style={styles.list}>
            {topProjects.map((p, idx) => (
              <ListItem
                key={p.id}
                leading={<FolderIcon size={18} color={palette.accent} />}
                title={p.name}
                subtitle={`客户 ${p.customerName} · 任务 ${p.completedTaskCount}/${p.taskCount}`}
                trailing={<StatusBadge label={p.status} tone="neutral" />}
                divider={idx < topProjects.length - 1}
                onPress={() => navigate({ name: "ProjectOverview", projectId: p.id })}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader
            eyebrow="agents"
            title="重点 Agent"
            actionLabel="查看更多"
            onAction={() => navigate({ name: "AgentList" })}
          />
          <View style={styles.list}>
            {watchAgents.map((a, idx) => (
              <ListItem
                key={a.id}
                leading={<BotIcon size={18} color={palette.accent} />}
                title={a.name}
                subtitle={`${a.roleName} · 活跃 ${a.activeRunCount} · 等待审批 ${a.waitingReviewCount}`}
                trailing={
                  <StatusBadge
                    label={a.healthStatus}
                    tone={a.healthStatus === "healthy" ? "success" : "warning"}
                    dot
                  />
                }
                divider={idx < watchAgents.length - 1}
                onPress={() => navigate({ name: "AgentDetail", agentId: a.id })}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    paddingTop: (StatusBar.currentHeight ?? 0) + spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  heroTime: {
    flexShrink: 0,
    letterSpacing: 0.4,
  },
  eyebrow: {
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  search: {
    marginBottom: spacing.lg,
  },
  kpis: {
    marginBottom: spacing.xl,
  },
  section: {
    marginTop: spacing.xl,
  },
  list: {
    backgroundColor: palette.bgSurface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    overflow: "hidden",
  },
  emptyTile: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: palette.bgSurface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    alignItems: "center",
  },
});
