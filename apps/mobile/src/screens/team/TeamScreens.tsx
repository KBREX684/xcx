import * as React from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AppBar,
  AppScreen,
  BotIcon,
  Button,
  Card,
  EmptyState,
  FolderIcon,
  KpiCard,
  KpiGrid,
  ListItem,
  LoadingState,
  PlusIcon,
  SectionHeader,
  SegmentedControl,
  SettingsIcon,
  StatusBadge,
  Typography,
  haptic,
  palette,
  radius,
  spacing,
  toast,
} from "@agent-control-plane/mobile-ui";
import type { MobileAgentStatus, MobileTeamDetail } from "@agent-control-plane/domain/src/mobile";
import { agentService, teamService } from "../../services/controlPlaneService";
import type { RouteContext } from "../../navigation/routes";
import { useAuth } from "../../state/AuthContext";
import { ChoiceChip, ChoiceWrap, Field, FormCard } from "../shared/FormControls";

type TeamTab = "overview" | "agents" | "projects" | "issues";

export function TeamListScreen({ navigate, goBack, canGoBack }: RouteContext) {
  const { session } = useAuth();
  const memberId = session?.memberId;
  const query = useQuery({
    queryKey: ["mobile.teams", memberId],
    queryFn: async () => {
      const r = await teamService.list({ limit: 80 }, memberId);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });

  return (
    <AppScreen padded={false}>
      <AppBar
        title="团队"
        onBack={canGoBack ? goBack : undefined}
        right={
          <IconButton label="创建团队" onPress={() => navigate({ name: "TeamForm" })}>
            <PlusIcon size={20} color={palette.accent} />
          </IconButton>
        }
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError || !query.data ? (
        <EmptyState
          tone="danger"
          title="加载失败"
          description={query.error instanceof Error ? query.error.message : ""}
          actionLabel="重试"
          onAction={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={query.data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching}
              onRefresh={() => void query.refetch()}
              tintColor={palette.accent}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerGroup}>
              <Card>
                <ListItem
                  leading={<BotIcon size={18} color={palette.accent} />}
                  title="Agent 配置"
                  subtitle="创建智能体、维护能力、绑定团队"
                  chevron
                  onPress={() => navigate({ name: "AgentList" })}
                />
              </Card>
              <SectionHeader eyebrow="teams" title="团队列表" />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="暂无团队"
              description="先创建团队，再把 Agent 和项目绑定进去。"
              actionLabel="创建团队"
              onAction={() => navigate({ name: "TeamForm" })}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.teamCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.name}
                onPress={() => navigate({ name: "TeamDetail", teamId: item.id })}
                style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}
              >
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Typography variant="title" weight="semibold">
                      {item.name}
                    </Typography>
                    <Typography variant="caption" tone="muted">
                      {item.description || "未填写团队说明"}
                    </Typography>
                  </View>
                  <StatusBadge label={item.status} tone="neutral" />
                </View>
                <View style={styles.metricsRow}>
                  <Metric label="Agent" value={`${item.activeAgentCount}/${item.agentCount}`} />
                  <Metric label="项目" value={item.projectCount} />
                  <Metric label="运行中" value={item.runningExecutionCount} />
                </View>
              </Pressable>
            </Card>
          )}
        />
      )}
    </AppScreen>
  );
}

export function TeamDetailScreen({ teamId, ctx }: { teamId: string; ctx: RouteContext }) {
  const [tab, setTab] = React.useState<TeamTab>("overview");
  const query = useQuery({
    queryKey: ["mobile.team.detail", teamId],
    queryFn: async () => {
      const r = await teamService.detail(teamId);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });

  return (
    <AppScreen padded={false}>
      <AppBar
        title="团队详情"
        onBack={ctx.goBack}
        right={
          <IconButton label="编辑团队" onPress={() => ctx.navigate({ name: "TeamForm", teamId })}>
            <SettingsIcon size={20} color={palette.accent} />
          </IconButton>
        }
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError || !query.data ? (
        <EmptyState
          tone="danger"
          title="加载失败"
          description={query.error instanceof Error ? query.error.message : ""}
          actionLabel="重试"
          onAction={() => void query.refetch()}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.titleBlock}>
            <Typography variant="titleLg" weight="semibold">
              {query.data.name}
            </Typography>
            <Typography variant="caption" tone="muted">
              {query.data.description || "未填写团队说明"}
            </Typography>
          </View>
          <SegmentedControl<TeamTab>
            value={tab}
            onChange={(next) => setTab(next)}
            options={[
              { value: "overview", label: "概览" },
              { value: "agents", label: "Agent", badge: query.data.agentCount },
              { value: "projects", label: "项目", badge: query.data.projectCount },
              { value: "issues", label: "事项" },
            ]}
          />
          {tab === "overview" ? <TeamOverview team={query.data} /> : null}
          {tab === "agents" ? <TeamAgents team={query.data} ctx={ctx} /> : null}
          {tab === "projects" ? <TeamProjects team={query.data} ctx={ctx} /> : null}
          {tab === "issues" ? <TeamIssues team={query.data} /> : null}
        </ScrollView>
      )}
    </AppScreen>
  );
}

export function TeamFormScreen({ teamId, ctx }: { teamId?: string; ctx: RouteContext }) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [agentIds, setAgentIds] = React.useState<string[]>([]);
  const [triageEnabled, setTriageEnabled] = React.useState(true);
  const [issueStatuses, setIssueStatuses] = React.useState("待处理,进行中,受阻,已完成");
  const [agentGuidance, setAgentGuidance] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const loadedRef = React.useRef<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["mobile.team.detail", teamId],
    enabled: Boolean(teamId),
    queryFn: async () => {
      const r = await teamService.detail(teamId!);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });

  const agentsQuery = useQuery({
    queryKey: ["mobile.agents", session?.memberId],
    queryFn: async () => {
      const r = await agentService.list(session?.memberId);
      if (!r.ok) throw new Error(r.error.message);
      return r.data.items;
    },
  });

  React.useEffect(() => {
    if (!detailQuery.data || loadedRef.current === detailQuery.data.id) return;
    loadedRef.current = detailQuery.data.id;
    setName(detailQuery.data.name);
    setDescription(detailQuery.data.description ?? "");
    setAgentIds(detailQuery.data.bindings.map((item) => item.agentId));
    setTriageEnabled(detailQuery.data.triageEnabled);
    setIssueStatuses(detailQuery.data.issueStatuses.join(","));
    setAgentGuidance(detailQuery.data.agentGuidance ?? "");
  }, [detailQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const statuses = issueStatuses
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      const input = {
        name,
        description,
        agentIds,
        triageEnabled,
        issueStatuses: statuses.length > 0 ? statuses : undefined,
        agentGuidance,
      };
      const r = teamId ? await teamService.update(teamId, input) : await teamService.create(input);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
    onSuccess: async (team) => {
      haptic.weak();
      toast.success(teamId ? "团队已更新" : "团队已创建");
      await qc.invalidateQueries({ queryKey: ["mobile.teams"] });
      await qc.invalidateQueries({ queryKey: ["mobile.team.detail", team.id] });
      ctx.replace({ name: "TeamDetail", teamId: team.id });
    },
    onError: (err) => {
      haptic.warn();
      setError(err instanceof Error ? err.message : "保存失败");
    },
  });

  const agents = agentsQuery.data ?? [];
  const submitting = mutation.isPending;

  const toggleAgent = (agentId: string) => {
    setAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((item) => item !== agentId) : [...prev, agentId],
    );
  };

  const handleSubmit = () => {
    if (name.trim().length < 2) {
      setError("团队名称至少 2 个字");
      return;
    }
    setError(null);
    mutation.mutate();
  };

  if (teamId && detailQuery.isLoading) {
    return (
      <AppScreen>
        <AppBar title="编辑团队" onBack={ctx.goBack} />
        <LoadingState />
      </AppScreen>
    );
  }

  return (
    <AppScreen padded={false}>
      <AppBar title={teamId ? "编辑团队" : "创建团队"} onBack={ctx.goBack} />
      <View style={styles.formShell}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <SectionHeader eyebrow="team" title="基础信息" />
          <FormCard>
            <Field label="团队名称" value={name} onChangeText={setName} placeholder="例如：交付指挥组" />
            <Field
              label="团队说明"
              value={description}
              onChangeText={setDescription}
              placeholder="说明团队负责的交付阶段、协作边界和默认 Agent 组合"
              multiline
            />
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <Typography variant="body" weight="medium">
                  开启事项分诊
                </Typography>
                <Typography variant="caption" tone="muted">
                  团队页会展示 triage / active / backlog 等事项入口
                </Typography>
              </View>
              <Switch
                value={triageEnabled}
                onValueChange={setTriageEnabled}
                trackColor={{ false: palette.bgSubtle, true: palette.accentSoft }}
                thumbColor={triageEnabled ? palette.accent : palette.textMuted}
              />
            </View>
            <Field
              label="事项状态"
              value={issueStatuses}
              onChangeText={setIssueStatuses}
              placeholder="待处理,进行中,受阻,已完成"
            />
            <Field
              label="Agent 协作说明"
              value={agentGuidance}
              onChangeText={setAgentGuidance}
              placeholder="给团队内 Agent 的工作边界、风格和验收标准"
              multiline
            />
          </FormCard>

          <SectionHeader eyebrow="agents" title="绑定 Agent" style={styles.sectionGap} />
          <View style={styles.agentList}>
            {agents.length === 0 ? (
              <Card>
                <Typography variant="body" tone="muted">
                  暂无可绑定 Agent，可先到 Agent 配置页创建。
                </Typography>
              </Card>
            ) : (
              agents.map((agent) => (
                <AgentSelectRow
                  key={agent.id}
                  agent={agent}
                  selected={agentIds.includes(agent.id)}
                  onPress={() => toggleAgent(agent.id)}
                />
              ))
            )}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          {error ? (
            <Typography variant="caption" tone="danger" style={styles.footerError}>
              {error}
            </Typography>
          ) : null}
          <Button
            label={teamId ? "保存团队" : "创建团队"}
            loading={submitting}
            disabled={submitting}
            onPress={handleSubmit}
            fullWidth
          />
        </View>
      </View>
    </AppScreen>
  );
}

function TeamOverview({ team }: { team: MobileTeamDetail }) {
  return (
    <View style={styles.tabBody}>
      <KpiGrid>
        <KpiCard label="Agent" value={`${team.activeAgentCount}/${team.agentCount}`} />
        <KpiCard label="项目" value={team.projectCount} />
        <KpiCard label="运行中" value={team.runningExecutionCount} tone="info" />
        <KpiCard label="分诊" value={team.triageEnabled ? "开" : "关"} />
      </KpiGrid>
      <Card style={styles.cardGap}>
        <Typography variant="title" weight="semibold">
          协作说明
        </Typography>
        <Typography variant="body" tone="secondary" style={styles.paragraph}>
          {team.agentGuidance || "暂无团队级 Agent 协作说明。"}
        </Typography>
      </Card>
    </View>
  );
}

function TeamAgents({ team, ctx }: { team: MobileTeamDetail; ctx: RouteContext }) {
  return (
    <View style={styles.tabBody}>
      <Button
        label="调整绑定"
        variant="secondary"
        onPress={() => ctx.navigate({ name: "TeamForm", teamId: team.id })}
      />
      {team.bindings.length === 0 ? (
        <EmptyState title="暂无 Agent" description="进入编辑团队后可以绑定 Agent。" />
      ) : (
        <View style={styles.groupList}>
          {team.bindings.map((item, idx) => (
            <ListItem
              key={item.agentId}
              leading={<BotIcon size={18} color={palette.accent} />}
              title={item.agentName}
              subtitle={`${item.roleName} · ${item.transport} · ${item.capabilities.slice(0, 3).join(" / ") || "暂无能力"}`}
              trailing={<StatusBadge label={item.healthStatus} tone="neutral" />}
              divider={idx < team.bindings.length - 1}
              chevron
              onPress={() => ctx.navigate({ name: "AgentDetail", agentId: item.agentId })}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function TeamProjects({ team, ctx }: { team: MobileTeamDetail; ctx: RouteContext }) {
  return (
    <View style={styles.tabBody}>
      {team.projects.length === 0 ? (
        <EmptyState title="暂无项目" description="创建项目时选择这个团队后会出现在这里。" />
      ) : (
        <View style={styles.groupList}>
          {team.projects.map((project, idx) => (
            <ListItem
              key={project.id}
              leading={<FolderIcon size={18} color={palette.accent} />}
              title={project.name}
              subtitle={`${project.projectCode} · ${project.lastEventAt ?? "暂无事件"}`}
              trailing={<StatusBadge label={project.status} tone="neutral" />}
              divider={idx < team.projects.length - 1}
              chevron
              onPress={() => ctx.navigate({ name: "ProjectOverview", projectId: project.id })}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function TeamIssues({ team }: { team: MobileTeamDetail }) {
  return (
    <View style={styles.tabBody}>
      <Card>
        <Typography variant="title" weight="semibold">
          事项状态
        </Typography>
        <ChoiceWrap>
          {team.issueStatuses.map((status) => (
            <ChoiceChip key={status} label={status} active />
          ))}
        </ChoiceWrap>
        <Typography variant="caption" tone="muted" style={styles.paragraph}>
          移动端先展示团队事项分组与运行状态；复杂视图和过滤器仍在 Web 端处理。
        </Typography>
      </Card>
    </View>
  );
}

function AgentSelectRow({
  agent,
  selected,
  onPress,
}: {
  agent: MobileAgentStatus;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.selectRow, pressed && styles.pressed]}
    >
      <View style={styles.flex}>
        <Typography variant="body" weight="semibold">
          {agent.name}
        </Typography>
        <Typography variant="caption" tone="muted">
          {agent.roleName} · {agent.transport} · {agent.capabilities.slice(0, 3).join(" / ") || "暂无能力"}
        </Typography>
      </View>
      <ChoiceChip label={selected ? "已选" : "选择"} active={selected} />
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.metric}>
      <Typography variant="caption" tone="muted">
        {label}
      </Typography>
      <Typography variant="body" weight="semibold">
        {String(value)}
      </Typography>
    </View>
  );
}

function IconButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  body: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  headerGroup: {
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  teamCard: {
    marginTop: spacing.md,
    padding: 0,
    overflow: "hidden",
  },
  cardPressable: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    minHeight: 58,
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.bgSubtle,
  },
  titleBlock: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tabBody: {
    marginTop: spacing.lg,
  },
  cardGap: {
    marginTop: spacing.lg,
  },
  paragraph: {
    marginTop: spacing.sm,
  },
  groupList: {
    marginTop: spacing.md,
    backgroundColor: palette.bgSurface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    overflow: "hidden",
  },
  formShell: {
    flex: 1,
  },
  sectionGap: {
    marginTop: spacing.xl,
  },
  switchRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  agentList: {
    gap: spacing.sm,
  },
  selectRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.bgSurface,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    backgroundColor: palette.bgSurface,
  },
  footerError: {
    marginBottom: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    backgroundColor: palette.bgSubtle,
  },
});
