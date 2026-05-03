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
  KpiCard,
  KpiGrid,
  LoadingState,
  PlusIcon,
  SectionHeader,
  SettingsIcon,
  StatusBadge,
  Typography,
  haptic,
  palette,
  radius,
  spacing,
  toast,
} from "@agent-control-plane/mobile-ui";
import { agentService, teamService } from "../../services/controlPlaneService";
import type { RouteContext } from "../../navigation/routes";
import { useAuth } from "../../state/AuthContext";
import { ChoiceChip, ChoiceWrap, Field, FormCard } from "../shared/FormControls";

const TRANSPORTS = ["mock", "openapi", "mcp-relay"] as const;
const AGENT_STATUSES = ["active", "inactive", "maintenance", "error"] as const;

export function AgentListScreen({ navigate, goBack, canGoBack }: RouteContext) {
  const { session } = useAuth();
  const memberId = session?.memberId;
  const query = useQuery({
    queryKey: ["mobile.agents", memberId],
    queryFn: async () => {
      const r = await agentService.list(memberId);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });

  return (
    <AppScreen padded={false}>
      <AppBar
        title="Agent"
        onBack={canGoBack ? goBack : undefined}
        right={
          <IconButton label="创建 Agent" onPress={() => navigate({ name: "AgentForm" })}>
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
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={query.isFetching} onRefresh={() => void query.refetch()} />
          }
          ListEmptyComponent={
            <EmptyState
              title="暂无 Agent"
              description="创建智能体后，可以绑定到团队和流程节点。"
              actionLabel="创建 Agent"
              onAction={() => navigate({ name: "AgentForm" })}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.name}
                onPress={() => navigate({ name: "AgentDetail", agentId: item.id })}
                style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}
              >
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Typography variant="bodyLg" weight="semibold">
                      {item.name}
                    </Typography>
                    <Typography variant="caption" tone="muted">
                      {item.roleName} · {item.transport}
                    </Typography>
                  </View>
                  <StatusBadge
                    label={item.healthStatus}
                    tone={item.healthStatus === "healthy" ? "success" : "warning"}
                    dot
                  />
                </View>
                <Typography variant="caption" tone="muted">
                  能力 {item.capabilities.slice(0, 4).join(" / ") || "暂无"} · 团队{" "}
                  {item.boundTeams.length}
                </Typography>
                <Typography variant="caption" tone="muted">
                  活跃 {item.activeRunCount} · 等待审批 {item.waitingReviewCount} · 任务 {item.taskCount}
                </Typography>
              </Pressable>
            </Card>
          )}
        />
      )}
    </AppScreen>
  );
}

export function AgentDetailScreen({ agentId, ctx }: { agentId: string; ctx: RouteContext }) {
  const query = useQuery({
    queryKey: ["mobile.agent.detail", agentId],
    queryFn: async () => {
      const r = await agentService.detail(agentId);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });

  return (
    <AppScreen padded={false}>
      <AppBar
        title="Agent 详情"
        onBack={ctx.goBack}
        right={
          <IconButton label="配置 Agent" onPress={() => ctx.navigate({ name: "AgentForm", agentId })}>
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
          <Typography variant="titleLg" weight="semibold">
            {query.data.name}
          </Typography>
          <Typography variant="caption" tone="muted">
            {query.data.roleName} · {query.data.transport}
          </Typography>
          <KpiGrid style={{ marginTop: spacing.lg }}>
            <KpiCard
              label="成功率"
              value={
                query.data.successRate === null || query.data.successRate === undefined
                  ? "-"
                  : `${Math.round(query.data.successRate)}%`
              }
              tone={
                query.data.successRate === null || query.data.successRate === undefined
                  ? "default"
                  : query.data.successRate >= 90
                    ? "success"
                    : query.data.successRate >= 70
                      ? "warning"
                      : "danger"
              }
            />
            <KpiCard label="活跃 Run" value={String(query.data.activeRunCount)} hint={`累计 ${query.data.runCount}`} />
            <KpiCard
              label="待审批"
              value={String(query.data.waitingReviewCount)}
              tone={query.data.waitingReviewCount > 0 ? "warning" : "default"}
            />
            <KpiCard label="团队" value={String(query.data.boundTeams.length)} />
          </KpiGrid>

          <Card style={styles.cardGap}>
            <Typography variant="title" weight="semibold">
              状态
            </Typography>
            <View style={styles.badgeRow}>
              <StatusBadge label={query.data.status} tone="neutral" dot />
              <StatusBadge
                label={query.data.operatingState}
                tone={query.data.operatingState === "blocked" ? "danger" : "info"}
                dot
              />
              <StatusBadge label={query.data.healthStatus} tone="neutral" dot />
            </View>
            <Typography variant="caption" tone="muted" style={styles.inlineHint}>
              最后心跳 {query.data.lastSeenAt ?? "-"}
            </Typography>
          </Card>

          <Card style={styles.cardGap}>
            <Typography variant="title" weight="semibold">
              说明
            </Typography>
            <Typography variant="body" tone="secondary" style={styles.inlineHint}>
              {query.data.description || "暂无说明"}
            </Typography>
          </Card>

          <Card style={styles.cardGap}>
            <Typography variant="title" weight="semibold">
              能力
            </Typography>
            <ChoiceWrap>
              {query.data.capabilities.length === 0 ? (
                <ChoiceChip label="暂无能力" disabled />
              ) : (
                query.data.capabilities.map((c) => <ChoiceChip key={c} label={c} active />)
              )}
            </ChoiceWrap>
          </Card>

          <Card style={styles.cardGap}>
            <Typography variant="title" weight="semibold">
              绑定团队
            </Typography>
            {query.data.boundTeams.length === 0 ? (
              <Typography variant="body" tone="muted" style={styles.inlineHint}>
                暂未绑定团队
              </Typography>
            ) : (
              <View style={styles.teamList}>
                {query.data.boundTeams.map((team) => (
                  <Typography key={team.id} variant="body">
                    {team.name}
                  </Typography>
                ))}
              </View>
            )}
          </Card>
        </ScrollView>
      )}
    </AppScreen>
  );
}

export function AgentFormScreen({ agentId, ctx }: { agentId?: string; ctx: RouteContext }) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [name, setName] = React.useState("");
  const [roleName, setRoleName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [transport, setTransport] = React.useState<(typeof TRANSPORTS)[number]>("openapi");
  const [status, setStatus] = React.useState<(typeof AGENT_STATUSES)[number]>("active");
  const [capabilities, setCapabilities] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [teamIds, setTeamIds] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const loadedRef = React.useRef<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["mobile.agent.detail", agentId],
    enabled: Boolean(agentId),
    queryFn: async () => {
      const r = await agentService.detail(agentId!);
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });

  const teamsQuery = useQuery({
    queryKey: ["mobile.teams", session?.memberId, "agent-form"],
    queryFn: async () => {
      const r = await teamService.list({ limit: 100 }, session?.memberId);
      if (!r.ok) throw new Error(r.error.message);
      return r.data.items;
    },
  });

  React.useEffect(() => {
    if (!detailQuery.data || loadedRef.current === detailQuery.data.id) return;
    loadedRef.current = detailQuery.data.id;
    setName(detailQuery.data.name);
    setRoleName(detailQuery.data.roleName);
    setDescription(detailQuery.data.description);
    setTransport(detailQuery.data.transport);
    setStatus(detailQuery.data.status);
    setCapabilities(detailQuery.data.capabilities.join(","));
    setTags((detailQuery.data.tags ?? []).join(","));
    setTeamIds(detailQuery.data.boundTeams.map((team) => team.id));
  }, [detailQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const capabilityList = splitList(capabilities);
      const tagList = splitList(tags);
      const input = {
        name,
        roleName,
        description,
        transport,
        capabilities: capabilityList,
        tags: tagList,
        ...(agentId ? { status } : {}),
      };
      const saved = agentId ? await agentService.update(agentId, input) : await agentService.create(input);
      if (!saved.ok) throw new Error(saved.error.message);
      const teams = await agentService.updateTeams(saved.data.id, { teamIds });
      if (!teams.ok) throw new Error(teams.error.message);
      return teams.data;
    },
    onSuccess: async (agent) => {
      haptic.weak();
      toast.success(agentId ? "Agent 已更新" : "Agent 已创建");
      await qc.invalidateQueries({ queryKey: ["mobile.agents"] });
      await qc.invalidateQueries({ queryKey: ["mobile.teams"] });
      await qc.invalidateQueries({ queryKey: ["mobile.agent.detail", agent.id] });
      ctx.replace({ name: "AgentDetail", agentId: agent.id });
    },
    onError: (err) => {
      haptic.warn();
      setError(err instanceof Error ? err.message : "保存失败");
    },
  });

  const toggleTeam = (teamId: string) => {
    setTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((item) => item !== teamId) : [...prev, teamId],
    );
  };

  const handleSubmit = () => {
    if (name.trim().length < 2 || roleName.trim().length < 2 || description.trim().length < 2) {
      setError("名称、角色和说明都至少 2 个字");
      return;
    }
    if (splitList(capabilities).length === 0) {
      setError("至少声明一个能力");
      return;
    }
    setError(null);
    mutation.mutate();
  };

  if (agentId && detailQuery.isLoading) {
    return (
      <AppScreen>
        <AppBar title="配置 Agent" onBack={ctx.goBack} />
        <LoadingState />
      </AppScreen>
    );
  }

  const teams = teamsQuery.data ?? [];

  return (
    <AppScreen padded={false}>
      <AppBar title={agentId ? "配置 Agent" : "创建 Agent"} onBack={ctx.goBack} />
      <View style={styles.formShell}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <SectionHeader eyebrow="agent" title="基础信息" />
          <FormCard>
            <Field label="Agent 名称" value={name} onChangeText={setName} placeholder="例如：Frontend Agent" />
            <Field label="角色名称" value={roleName} onChangeText={setRoleName} placeholder="例如：前端实现" />
            <Field
              label="说明"
              value={description}
              onChangeText={setDescription}
              placeholder="说明 Agent 的职责、边界和验收方式"
              multiline
            />
            <Typography variant="caption" tone="muted" weight="medium">
              Transport
            </Typography>
            <ChoiceWrap>
              {TRANSPORTS.map((item) => (
                <ChoiceChip
                  key={item}
                  label={item}
                  active={transport === item}
                  onPress={() => setTransport(item)}
                />
              ))}
            </ChoiceWrap>
            {agentId ? (
              <>
                <Typography variant="caption" tone="muted" weight="medium">
                  状态
                </Typography>
                <ChoiceWrap>
                  {AGENT_STATUSES.map((item) => (
                    <ChoiceChip
                      key={item}
                      label={item}
                      active={status === item}
                      onPress={() => setStatus(item)}
                    />
                  ))}
                </ChoiceWrap>
              </>
            ) : null}
            <Field
              label="能力"
              value={capabilities}
              onChangeText={setCapabilities}
              placeholder="frontend,requirements,qa_review"
            />
            <Field label="标签" value={tags} onChangeText={setTags} placeholder="delivery,web,priority" />
          </FormCard>

          <SectionHeader eyebrow="teams" title="绑定团队" style={styles.sectionGap} />
          <View style={styles.teamSelectList}>
            {teams.length === 0 ? (
              <Card>
                <Typography variant="body" tone="muted">
                  暂无团队，可先到团队页创建。
                </Typography>
              </Card>
            ) : (
              teams.map((team) => (
                <Pressable
                  key={team.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: teamIds.includes(team.id) }}
                  onPress={() => toggleTeam(team.id)}
                  style={({ pressed }) => [styles.selectRow, pressed && styles.pressed]}
                >
                  <View style={styles.flex}>
                    <Typography variant="body" weight="semibold">
                      {team.name}
                    </Typography>
                    <Typography variant="caption" tone="muted">
                      Agent {team.agentCount} · 项目 {team.projectCount}
                    </Typography>
                  </View>
                  <ChoiceChip label={teamIds.includes(team.id) ? "已选" : "选择"} active={teamIds.includes(team.id)} />
                </Pressable>
              ))
            )}
          </View>

          <Card style={styles.sectionGap}>
            <Typography variant="title" weight="semibold">
              高级操作
            </Typography>
            <Typography variant="caption" tone="muted" style={styles.inlineHint}>
              密钥轮换、能力授权撤销等高风险操作保留在 Web 端审计界面处理，移动端只维护日常配置。
            </Typography>
          </Card>
        </ScrollView>
        <View style={styles.footer}>
          {error ? (
            <Typography variant="caption" tone="danger" style={styles.footerError}>
              {error}
            </Typography>
          ) : null}
          <Button
            label={agentId ? "保存 Agent" : "创建 Agent"}
            loading={mutation.isPending}
            disabled={mutation.isPending}
            onPress={handleSubmit}
            fullWidth
          />
        </View>
      </View>
    </AppScreen>
  );
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
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
  list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  card: { marginBottom: spacing.md, padding: 0, overflow: "hidden" },
  cardPressable: { padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  flex: { flex: 1, minWidth: 0 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  cardGap: { marginTop: spacing.lg },
  inlineHint: { marginTop: spacing.sm },
  teamList: { marginTop: spacing.sm, gap: spacing.xs },
  formShell: { flex: 1 },
  sectionGap: { marginTop: spacing.xl },
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
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    backgroundColor: palette.bgSurface,
  },
  footerError: { marginBottom: spacing.sm },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { backgroundColor: palette.bgSubtle },
});
