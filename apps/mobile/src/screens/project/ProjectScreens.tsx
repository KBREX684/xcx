import * as React from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AppBar,
  AppScreen,
  Button,
  Card,
  EmptyState,
  EvidenceSummaryBlock,
  FolderIcon,
  ListItem,
  LoadingState,
  PlusIcon,
  SectionHeader,
  SegmentedControl,
  SettingsIcon,
  StatusBadge,
  Typography,
  WorkflowIcon,
  haptic,
  palette,
  radius,
  spacing,
  toast,
} from "@agent-control-plane/mobile-ui";
import {
  createMobileClientRequestId,
  type MobileTeamSummary,
  type MobileWorkflowTemplateSummary,
} from "@agent-control-plane/domain/src/mobile";
import { projectService, runService, teamService, workflowService } from "../../services/controlPlaneService";
import type { RouteContext } from "../../navigation/routes";
import { useAuth } from "../../state/AuthContext";
import { ChoiceChip, ChoiceWrap, Field, FormCard, KeyValue } from "../shared/FormControls";

type ProjectOverviewTab = "overview" | "runs" | "proof";

const HEALTH_OPTIONS = ["on_track", "at_risk", "blocked"] as const;
const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"] as const;
const PROJECT_STATUSES = ["draft", "active", "paused", "delivered", "archived"] as const;

export function ProjectListScreen({ navigate, goBack, canGoBack }: RouteContext) {
  const { session } = useAuth();
  const memberId = session?.memberId;
  const query = useQuery({
    queryKey: ["mobile.projects", memberId],
    queryFn: async () => {
      const r = await projectService.list({ limit: 50 }, memberId);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });

  return (
    <AppScreen padded={false}>
      <AppBar
        title="项目"
        onBack={canGoBack ? goBack : undefined}
        right={
          <IconButton label="创建项目" onPress={() => navigate({ name: "ProjectForm" })}>
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
          actionLabel="重试"
          onAction={() => void query.refetch()}
          description={query.error instanceof Error ? query.error.message : ""}
        />
      ) : (
        <FlatList
          data={query.data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={ProjectSeparator}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching}
              onRefresh={() => void query.refetch()}
              tintColor={palette.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="暂无项目"
              description="创建项目后，就可以在移动端触发流程和审阅产物。"
              actionLabel="创建项目"
              onAction={() => navigate({ name: "ProjectForm" })}
            />
          }
          renderItem={({ item }) => (
            <ListItem
              leading={<FolderIcon size={18} color={palette.accent} />}
              title={item.name}
              subtitle={`客户 ${item.customerName} · 团队 ${item.teamName ?? "-"} · 任务 ${item.completedTaskCount}/${item.taskCount}`}
              trailing={<StatusBadge label={item.status} tone="neutral" />}
              chevron
              onPress={() => navigate({ name: "ProjectOverview", projectId: item.id })}
            />
          )}
        />
      )}
    </AppScreen>
  );
}

function ProjectSeparator() {
  return <View style={styles.listSep} />;
}

export function ProjectFormScreen({ projectId, ctx }: { projectId?: string; ctx: RouteContext }) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [name, setName] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [teamId, setTeamId] = React.useState("");
  const [health, setHealth] = React.useState<(typeof HEALTH_OPTIONS)[number]>("on_track");
  const [priority, setPriority] = React.useState<(typeof PRIORITY_OPTIONS)[number]>("medium");
  const [status, setStatus] = React.useState<(typeof PROJECT_STATUSES)[number]>("active");
  const [error, setError] = React.useState<string | null>(null);
  const loadedRef = React.useRef<string | null>(null);

  const projectQuery = useQuery({
    queryKey: ["mobile.project.overview", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const r = await projectService.overview(projectId!);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });

  const teamsQuery = useQuery({
    queryKey: ["mobile.teams", session?.memberId, "project-form"],
    queryFn: async () => {
      const r = await teamService.list({ limit: 100 }, session?.memberId);
      if (!r.ok) throw new Error(r.error.message);
      return r.data.items;
    },
  });

  React.useEffect(() => {
    if (!projectQuery.data || loadedRef.current === projectQuery.data.id) return;
    loadedRef.current = projectQuery.data.id;
    setName(projectQuery.data.name);
    setCustomerName(projectQuery.data.customerName);
    setDescription(projectQuery.data.description ?? "");
    setTeamId(projectQuery.data.teamId ?? "");
    setHealth((projectQuery.data.health as (typeof HEALTH_OPTIONS)[number]) ?? "on_track");
    setPriority((projectQuery.data.priority as (typeof PRIORITY_OPTIONS)[number]) ?? "medium");
    setStatus(projectQuery.data.status);
  }, [projectQuery.data]);

  React.useEffect(() => {
    if (teamId || !teamsQuery.data?.length || projectId) return;
    setTeamId(teamsQuery.data[0]?.id ?? "");
  }, [projectId, teamId, teamsQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const input = {
        name,
        customerName,
        description,
        teamId,
        health,
        priority,
        ...(projectId ? { status } : {}),
      };
      const r = projectId
        ? await projectService.update(projectId, input)
        : await projectService.create(input);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
    onSuccess: async (project) => {
      haptic.weak();
      toast.success(projectId ? "项目已更新" : "项目已创建");
      await qc.invalidateQueries({ queryKey: ["mobile.projects"] });
      await qc.invalidateQueries({ queryKey: ["mobile.project.overview", project.id] });
      ctx.replace({ name: "ProjectOverview", projectId: project.id });
    },
    onError: (err) => {
      haptic.warn();
      setError(err instanceof Error ? err.message : "保存失败");
    },
  });

  const handleSubmit = () => {
    if (name.trim().length < 2 || customerName.trim().length < 2) {
      setError("项目名称和客户名称都至少 2 个字");
      return;
    }
    if (!teamId) {
      setError("请选择项目所属团队");
      return;
    }
    setError(null);
    mutation.mutate();
  };

  if (projectId && projectQuery.isLoading) {
    return (
      <AppScreen>
        <AppBar title="项目设置" onBack={ctx.goBack} />
        <LoadingState />
      </AppScreen>
    );
  }

  const teams = teamsQuery.data ?? [];

  return (
    <AppScreen padded={false}>
      <AppBar title={projectId ? "项目设置" : "创建项目"} onBack={ctx.goBack} />
      <View style={styles.formShell}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <SectionHeader eyebrow="project" title="基础信息" />
          <FormCard>
            <Field label="项目名称" value={name} onChangeText={setName} placeholder="例如：旗舰店网站重建" />
            <Field label="客户名称" value={customerName} onChangeText={setCustomerName} placeholder="例如：Galaxy Cafe" />
            <Field
              label="项目说明"
              value={description}
              onChangeText={setDescription}
              placeholder="说明交付目标、范围和验收标准"
              multiline
            />
            <Typography variant="caption" tone="muted" weight="medium">
              健康状态
            </Typography>
            <ChoiceWrap>
              {HEALTH_OPTIONS.map((item) => (
                <ChoiceChip key={item} label={item} active={health === item} onPress={() => setHealth(item)} />
              ))}
            </ChoiceWrap>
            <Typography variant="caption" tone="muted" weight="medium">
              优先级
            </Typography>
            <ChoiceWrap>
              {PRIORITY_OPTIONS.map((item) => (
                <ChoiceChip key={item} label={item} active={priority === item} onPress={() => setPriority(item)} />
              ))}
            </ChoiceWrap>
            {projectId ? (
              <>
                <Typography variant="caption" tone="muted" weight="medium">
                  项目状态
                </Typography>
                <ChoiceWrap>
                  {PROJECT_STATUSES.map((item) => (
                    <ChoiceChip key={item} label={item} active={status === item} onPress={() => setStatus(item)} />
                  ))}
                </ChoiceWrap>
              </>
            ) : null}
          </FormCard>

          <SectionHeader eyebrow="team" title="所属团队" style={styles.sectionGap} />
          <View style={styles.teamSelectList}>
            {teams.length === 0 ? (
              <Card>
                <Typography variant="body" tone="muted">
                  暂无团队。请先在团队页创建团队，再创建项目。
                </Typography>
              </Card>
            ) : (
              teams.map((team) => (
                <ProjectTeamRow
                  key={team.id}
                  team={team}
                  active={teamId === team.id}
                  onPress={() => setTeamId(team.id)}
                />
              ))
            )}
          </View>
        </ScrollView>
        <View style={styles.projectFooter}>
          {error ? (
            <Typography variant="caption" tone="danger" style={styles.footerMeta}>
              {error}
            </Typography>
          ) : null}
          <Button
            label={projectId ? "保存项目" : "创建项目"}
            loading={mutation.isPending}
            disabled={mutation.isPending || teams.length === 0}
            onPress={handleSubmit}
            fullWidth
          />
        </View>
      </View>
    </AppScreen>
  );
}

export function ProjectOverviewScreen({
  projectId,
  initialTemplateId,
  ctx,
}: {
  projectId: string;
  initialTemplateId?: string;
  ctx: RouteContext;
}) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(
    initialTemplateId ?? null,
  );
  const [activeTab, setActiveTab] = React.useState<ProjectOverviewTab>("overview");

  React.useEffect(() => {
    if (initialTemplateId) setSelectedTemplateId(initialTemplateId);
  }, [initialTemplateId]);

  const projectQuery = useQuery({
    queryKey: ["mobile.project.overview", projectId],
    queryFn: async () => {
      const r = await projectService.overview(projectId);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });

  const workflowQuery = useQuery({
    queryKey: ["mobile.workflows", session?.memberId, "project"],
    queryFn: async () => {
      const r = await workflowService.list({ status: "active", limit: 30 }, session?.memberId);
      if (!r.ok) throw new Error(r.error.message);
      return r.data.items;
    },
    staleTime: 30_000,
  });

  const templates = workflowQuery.data ?? [];
  const selectedTemplate = React.useMemo(() => {
    if (templates.length === 0) return null;
    return templates.find((item) => item.id === selectedTemplateId) ?? templates[0] ?? null;
  }, [selectedTemplateId, templates]);

  React.useEffect(() => {
    if (!selectedTemplateId && templates[0]) setSelectedTemplateId(templates[0].id);
  }, [selectedTemplateId, templates]);

  const triggerMutation = useMutation({
    mutationFn: async (template: MobileWorkflowTemplateSummary) => {
      const requestId = createMobileClientRequestId("workflow");
      const res = await projectService.triggerWorkflow(projectId, template.id, requestId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: async (data) => {
      haptic.weak();
      toast.success("流程已触发");
      await qc.invalidateQueries({ queryKey: ["mobile.project.overview", projectId] });
      ctx.navigate({ name: "RunDetail", runId: data.runId });
    },
    onError: (err) => {
      haptic.warn();
      toast.error(err instanceof Error ? err.message : "触发失败");
    },
  });

  return (
    <AppScreen padded={false}>
      <AppBar
        title="项目概览"
        onBack={ctx.goBack}
        right={
          <IconButton label="项目设置" onPress={() => ctx.navigate({ name: "ProjectForm", projectId })}>
            <SettingsIcon size={20} color={palette.accent} />
          </IconButton>
        }
      />
      {projectQuery.isLoading ? (
        <LoadingState />
      ) : projectQuery.isError || !projectQuery.data ? (
        <EmptyState
          tone="danger"
          title="加载失败"
          actionLabel="重试"
          onAction={() => void projectQuery.refetch()}
        />
      ) : (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.bodyWithFooter}>
            <View style={styles.projectHeader}>
              <Typography variant="titleLg" weight="semibold">
                {projectQuery.data.name}
              </Typography>
              <Typography variant="caption" tone="muted">
                {projectQuery.data.projectCode} · 客户 {projectQuery.data.customerName}
              </Typography>
            </View>

            <SegmentedControl<ProjectOverviewTab>
              value={activeTab}
              onChange={(next) => setActiveTab(next)}
              options={[
                { value: "overview", label: "概览" },
                { value: "runs", label: "运行", badge: projectQuery.data.recentRuns?.length ?? 0 },
                { value: "proof", label: "证书" },
              ]}
              style={styles.tabs}
            />

            {activeTab === "overview" ? (
              <>
                <Card style={styles.cardGap}>
                  <Typography variant="title" weight="semibold">
                    健康与交付
                  </Typography>
                  <View style={styles.proofGrid}>
                    <KeyValue
                      label="证据链"
                      value={projectQuery.data.hashChainHealthy ? "健康" : "异常"}
                    />
                    <KeyValue label="待审批" value={projectQuery.data.pendingApprovalCount ?? 0} />
                    <KeyValue label="团队" value={projectQuery.data.teamName ?? "-"} />
                    <KeyValue label="头部 hash" value={projectQuery.data.chainHeadHash ?? "-"} />
                  </View>
                </Card>

                <TemplateSelectionCard
                  loading={workflowQuery.isLoading}
                  template={selectedTemplate}
                  onChoose={() =>
                    ctx.navigate({
                      name: "WorkflowPicker",
                      projectId,
                      selectedTemplateId: selectedTemplate?.id,
                    })
                  }
                  onCreate={() => ctx.navigate({ name: "WorkflowList" })}
                />
              </>
            ) : null}

            {activeTab === "runs" ? (
              <Card style={styles.cardGap}>
                <Typography variant="title" weight="semibold">
                  最近 Run
                </Typography>
                {projectQuery.data.recentRuns?.length ? (
                  <View style={styles.runList}>
                    {projectQuery.data.recentRuns.map((run) => (
                      <ListItem
                        key={run.id}
                        title={run.taskTitle}
                        subtitle={run.outputSummary ?? run.traceId}
                        trailing={
                          <StatusBadge
                            label={run.status}
                            tone={run.status === "failed" ? "danger" : "neutral"}
                          />
                        }
                        onPress={() => ctx.navigate({ name: "RunDetail", runId: run.id })}
                        chevron
                      />
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    title="暂无运行记录"
                    description="触发流程后，Agent 执行结果会出现在这里。"
                  />
                )}
              </Card>
            ) : null}

            {activeTab === "proof" ? (
              <Card style={styles.cardGap}>
                <Typography variant="title" weight="semibold">
                  证书与证据链
                </Typography>
                <View style={styles.proofGrid}>
                  <KeyValue label="链路" value={projectQuery.data.hashChainHealthy ? "完整" : "需要复核"} />
                  <KeyValue label="头部 hash" value={projectQuery.data.chainHeadHash ?? "-"} />
                  <KeyValue
                    label="最新证书"
                    value={
                      projectQuery.data.latestCertificate
                        ? String(projectQuery.data.latestCertificate.certificateNo ?? "-")
                        : "暂未签发"
                    }
                  />
                </View>
              </Card>
            ) : null}
          </ScrollView>

          <View style={styles.projectFooter}>
            <Typography variant="caption" tone="muted" numberOfLines={2} style={styles.footerMeta}>
              当前模板：{selectedTemplate?.name ?? "未选择"}
            </Typography>
            <Button
              label={triggerMutation.isPending ? "执行中" : "触发流程"}
              loading={triggerMutation.isPending}
              disabled={!selectedTemplate || triggerMutation.isPending}
              onPress={() => {
                if (selectedTemplate) triggerMutation.mutate(selectedTemplate);
              }}
              fullWidth
            />
          </View>
        </>
      )}
    </AppScreen>
  );
}

export function WorkflowPickerScreen({
  projectId,
  selectedTemplateId,
  ctx,
}: {
  projectId: string;
  selectedTemplateId?: string;
  ctx: RouteContext;
}) {
  const { session } = useAuth();
  const query = useQuery({
    queryKey: ["mobile.workflows", session?.memberId, "picker"],
    queryFn: async () => {
      const r = await workflowService.list({ status: "active", limit: 80 }, session?.memberId);
      if (!r.ok) throw new Error(r.error.message);
      return r.data.items;
    },
  });

  return (
    <AppScreen padded={false}>
      <AppBar title="选择流程模板" onBack={ctx.goBack} />
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
          data={query.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="暂无可用模板"
              description="先创建模板，再回到项目触发流程。"
              actionLabel="创建模板"
              onAction={() => ctx.navigate({ name: "WorkflowList" })}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: item.id === selectedTemplateId }}
              onPress={() =>
                ctx.replace({ name: "ProjectOverview", projectId, templateId: item.id })
              }
              style={({ pressed }) => [
                styles.templateRow,
                item.id === selectedTemplateId && styles.templateRowActive,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.flex}>
                <Typography variant="bodyLg" weight="semibold">
                  {item.name}
                </Typography>
                <Typography variant="caption" tone="muted">
                  {item.scenarioType} · {item.nodeCount} 个节点 · 使用 {item.usageCount} 次
                </Typography>
                <Typography variant="caption" tone="muted">
                  团队 {item.teamName ?? "-"} · 最近触发 {item.lastTriggeredAt ?? "-"}
                </Typography>
              </View>
              <StatusBadge label={item.id === selectedTemplateId ? "已选" : item.status} tone="neutral" />
            </Pressable>
          )}
        />
      )}
    </AppScreen>
  );
}

function TemplateSelectionCard({
  loading,
  template,
  onChoose,
  onCreate,
}: {
  loading: boolean;
  template: MobileWorkflowTemplateSummary | null;
  onChoose: () => void;
  onCreate: () => void;
}) {
  return (
    <Card style={styles.cardGap}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Typography variant="title" weight="semibold">
            选择流程模板
          </Typography>
          <Typography variant="caption" tone="muted">
            模板会决定本次项目流程的节点、Agent 和审批规则。
          </Typography>
        </View>
        <WorkflowIcon size={22} color={palette.accent} />
      </View>
      {loading ? (
        <Typography variant="caption" tone="muted" style={styles.inlineHint}>
          正在加载模板
        </Typography>
      ) : !template ? (
        <View style={styles.emptyWorkflow}>
          <Typography variant="body" tone="muted">
            还没有可用模板
          </Typography>
          <Button label="创建模板" variant="secondary" onPress={onCreate} />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="选择流程模板"
          onPress={onChoose}
          style={({ pressed }) => [styles.selectedTemplate, pressed && styles.pressed]}
        >
          <View style={styles.flex}>
            <Typography variant="bodyLg" weight="semibold">
              {template.name}
            </Typography>
            <Typography variant="caption" tone="muted">
              {template.scenarioType} · {template.nodeCount} 个节点 · 使用 {template.usageCount} 次
            </Typography>
            <Typography variant="caption" tone="muted">
              团队 {template.teamName ?? "-"} · 最近触发 {template.lastTriggeredAt ?? "-"}
            </Typography>
          </View>
          <Button label="更换" variant="secondary" size="sm" onPress={onChoose} />
        </Pressable>
      )}
    </Card>
  );
}

function ProjectTeamRow({
  team,
  active,
  onPress,
}: {
  team: MobileTeamSummary;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.selectRow, active && styles.selectRowActive, pressed && styles.pressed]}
    >
      <View style={styles.flex}>
        <Typography variant="body" weight="semibold">
          {team.name}
        </Typography>
        <Typography variant="caption" tone="muted">
          Agent {team.agentCount} · 项目 {team.projectCount} · 运行中 {team.runningExecutionCount}
        </Typography>
      </View>
      <ChoiceChip label={active ? "已选" : "选择"} active={active} />
    </Pressable>
  );
}

export function RunDetailScreen({ runId, ctx }: { runId: string; ctx: RouteContext }) {
  const detailQuery = useQuery({
    queryKey: ["mobile.run.detail", runId],
    queryFn: async () => {
      const r = await runService.detail(runId);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });
  const evidenceQuery = useQuery({
    queryKey: ["mobile.run.evidence", runId],
    queryFn: async () => {
      const r = await runService.evidence(runId);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });

  return (
    <AppScreen padded={false}>
      <AppBar title="Run 详情" subtitle={`Run ${runId.slice(-8)}`} onBack={ctx.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        {detailQuery.isLoading ? <LoadingState /> : null}
        {detailQuery.isError ? (
          <EmptyState
            tone="danger"
            title="加载失败"
            description={detailQuery.error instanceof Error ? detailQuery.error.message : ""}
            actionLabel="重试"
            onAction={() => void detailQuery.refetch()}
          />
        ) : null}
        {detailQuery.data ? (
          <>
            <Card>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Typography variant="title" weight="semibold">
                    {detailQuery.data.taskTitle}
                  </Typography>
                  <Typography variant="caption" tone="muted">
                    Agent {detailQuery.data.agentName} · {detailQuery.data.executorType}
                  </Typography>
                </View>
                <StatusBadge
                  label={detailQuery.data.status}
                  tone={detailQuery.data.status === "failed" ? "danger" : "neutral"}
                />
              </View>
              <Typography variant="caption" tone="muted" style={styles.inlineHint}>
                traceId {detailQuery.data.traceId}
              </Typography>
            </Card>

            <Card style={styles.cardGap}>
              <Typography variant="title" weight="semibold">
                回复正文
              </Typography>
              <Typography variant="body" tone="secondary" style={styles.longText}>
                {detailQuery.data.outputSummary || detailQuery.data.errorMessage || "暂无输出"}
              </Typography>
            </Card>

            {detailQuery.data.artifacts?.length ? (
              <Card style={styles.cardGap}>
                <Typography variant="title" weight="semibold">
                  产物摘要
                </Typography>
                <Typography variant="body" tone="secondary">
                  已生成 {detailQuery.data.artifacts.length} 个产物，可在 Web 端继续审阅和下载。
                </Typography>
              </Card>
            ) : null}
          </>
        ) : null}
        <View style={styles.cardGap}>
          <EvidenceSummaryBlock summary={evidenceQuery.data ?? null} />
        </View>
      </ScrollView>
    </AppScreen>
  );
}

export function TaskDetailScreen({ taskId, ctx }: { taskId: string; ctx: RouteContext }) {
  return (
    <AppScreen>
      <AppBar title="任务详情" onBack={ctx.goBack} />
      <EmptyState
        title="任务详情待补齐"
        description={`taskId=${taskId} 后续会提供时间线与对话详情。`}
      />
    </AppScreen>
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
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
  listSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.border,
    marginHorizontal: spacing.md,
  },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  bodyWithFooter: { padding: spacing.lg, paddingBottom: spacing.xxxl + 110 },
  formShell: { flex: 1 },
  projectHeader: { gap: spacing.xs, marginBottom: spacing.md },
  tabs: { marginBottom: spacing.sm },
  cardGap: { marginTop: spacing.lg },
  sectionGap: { marginTop: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  flex: { flex: 1, minWidth: 0 },
  inlineHint: { marginTop: spacing.sm },
  emptyWorkflow: { marginTop: spacing.md, gap: spacing.sm },
  selectedTemplate: {
    marginTop: spacing.md,
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.bgSubtle,
  },
  runList: { marginTop: spacing.md },
  proofGrid: { gap: spacing.sm, marginTop: spacing.md },
  projectFooter: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    backgroundColor: palette.bgElevated,
  },
  footerMeta: { alignSelf: "center" },
  longText: { marginTop: spacing.sm },
  teamSelectList: { gap: spacing.sm },
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
  selectRowActive: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  templateRow: {
    minHeight: 104,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.bgSurface,
  },
  templateRowActive: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { backgroundColor: palette.bgSubtle },
});
