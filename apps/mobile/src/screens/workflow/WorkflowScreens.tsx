import * as React from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AppBar,
  AppScreen,
  Button,
  Card,
  EmptyState,
  ListItem,
  LoadingState,
  PlusIcon,
  SectionHeader,
  SegmentedControl,
  StatusBadge,
  Typography,
  WorkflowIcon,
  haptic,
  palette,
  radius,
  spacing,
  toast,
} from "@agent-control-plane/mobile-ui";
import { mobileWorkflowTemplateInputSchema } from "@agent-control-plane/domain/src/mobile";
import type {
  MobileAgentStatus,
  MobileWorkflowTemplateInput,
  MobileWorkflowTemplateNode,
} from "@agent-control-plane/domain/src/mobile";
import { agentService, workflowService } from "../../services/controlPlaneService";
import { useAuth } from "../../state/AuthContext";
import type { RouteContext } from "../../navigation/routes";

type NodeType = MobileWorkflowTemplateNode["type"];
type TransportType = NonNullable<MobileWorkflowTemplateNode["transport"]>;
type WorkflowFormStep = "basics" | "nodes" | "agents" | "rules";
type NodeEditorMode = "structure" | "agents" | "rules";

const NODE_TYPES: ReadonlyArray<{ value: NodeType; label: string }> = [
  { value: "task", label: "任务" },
  { value: "approval", label: "审批" },
  { value: "condition", label: "条件" },
  { value: "parallel", label: "并行" },
  { value: "end", label: "结束" },
];

const TRANSPORTS: ReadonlyArray<{ value: TransportType; label: string }> = [
  { value: "mock", label: "Mock" },
  { value: "openapi", label: "OpenAPI" },
  { value: "mcp-relay", label: "MCP" },
];

const WORKFLOW_FORM_STEPS: ReadonlyArray<{ value: WorkflowFormStep; label: string }> = [
  { value: "basics", label: "基础" },
  { value: "nodes", label: "节点" },
  { value: "agents", label: "Agent" },
  { value: "rules", label: "规则" },
];

const PRESETS: ReadonlyArray<{
  key: string;
  label: string;
  scenarioType: string;
  nodes: MobileWorkflowTemplateNode[];
}> = [
  {
    key: "website",
    label: "网站建设",
    scenarioType: "website_delivery",
    nodes: [
      {
        key: "requirements",
        type: "task",
        name: "需求梳理",
        capabilityCode: "requirements",
        transport: "openapi",
      },
      {
        key: "frontend",
        type: "task",
        name: "前端实现",
        capabilityCode: "frontend",
        transport: "openapi",
      },
      { key: "qa_review", type: "approval", name: "上线复核" },
      {
        key: "certificate",
        type: "task",
        name: "证书与交付",
        capabilityCode: "delivery_docs",
        transport: "openapi",
      },
      { key: "done", type: "end", name: "交付完成" },
    ],
  },
  {
    key: "delivery",
    label: "交付闭环",
    scenarioType: "delivery",
    nodes: [
      {
        key: "plan",
        type: "task",
        name: "交付计划",
        capabilityCode: "planning",
        transport: "openapi",
      },
      {
        key: "docs",
        type: "task",
        name: "交付文档",
        capabilityCode: "documentation",
        transport: "openapi",
      },
      { key: "client_acceptance", type: "approval", name: "客户确认" },
      { key: "archive", type: "end", name: "归档" },
    ],
  },
  {
    key: "ops",
    label: "运营异常",
    scenarioType: "operations",
    nodes: [
      {
        key: "monitor",
        type: "task",
        name: "异常识别",
        capabilityCode: "ops_monitor",
        transport: "openapi",
      },
      {
        key: "risk_gate",
        type: "condition",
        name: "风险判断",
        predicate: "存在上线风险",
        trueBranchKey: "fix",
        falseBranchKey: "report",
      },
      {
        key: "fix",
        type: "task",
        name: "修复建议",
        capabilityCode: "ops_fix",
        transport: "openapi",
      },
      {
        key: "report",
        type: "task",
        name: "日报汇总",
        capabilityCode: "ops_report",
        transport: "openapi",
      },
      { key: "done", type: "end", name: "处理完成" },
    ],
  },
  {
    key: "parallel",
    label: "并行协作",
    scenarioType: "parallel_delivery",
    nodes: [
      {
        key: "brief",
        type: "task",
        name: "任务拆解",
        capabilityCode: "planning",
        transport: "openapi",
      },
      {
        key: "parallel_review",
        type: "parallel",
        name: "并行复核",
        branchKeys: ["content", "visual"],
        joinStrategy: "all",
      },
      {
        key: "content",
        type: "task",
        name: "内容复核",
        capabilityCode: "content_review",
        transport: "openapi",
      },
      {
        key: "visual",
        type: "task",
        name: "视觉复核",
        capabilityCode: "visual_review",
        transport: "openapi",
      },
      { key: "approval", type: "approval", name: "最终审批" },
      { key: "done", type: "end", name: "完成" },
    ],
  },
];

function defaultInput(): MobileWorkflowTemplateInput {
  const preset = PRESETS[0]!;
  return {
    name: "移动端网站建设流程",
    scenarioType: preset.scenarioType,
    version: "1.0.0",
    triggerType: "manual",
    status: "active",
    teamId: "",
    nodes: preset.nodes,
  };
}

export function WorkflowListScreen({ navigate, goBack }: RouteContext) {
  const { session } = useAuth();
  const memberId = session?.memberId;
  const query = useQuery({
    queryKey: ["mobile.workflows", memberId],
    queryFn: async () => {
      const res = await workflowService.list({ limit: 80 }, memberId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 20_000,
  });

  return (
    <AppScreen padded={false}>
      <AppBar
        title="流程模板"
        onBack={goBack}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="创建模板"
            onPress={() => navigate({ name: "WorkflowForm" })}
            hitSlop={8}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <PlusIcon size={20} color={palette.accent} />
          </Pressable>
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
          ListEmptyComponent={
            <EmptyState
              title="暂无流程模板"
              actionLabel="创建模板"
              onAction={() => navigate({ name: "WorkflowForm" })}
            />
          }
          renderItem={({ item }) => (
            <ListItem
              leading={<WorkflowIcon size={18} color={palette.accent} />}
              title={item.name}
              subtitle={`${item.scenarioType} · ${item.nodeCount} 个节点 · 使用 ${item.usageCount} 次`}
              trailing={
                <StatusBadge
                  label={item.status}
                  tone={item.status === "active" ? "success" : "neutral"}
                />
              }
              chevron
              onPress={() => navigate({ name: "WorkflowForm", templateId: item.id })}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </AppScreen>
  );
}

export function WorkflowFormScreen({
  templateId,
  ctx,
}: {
  templateId?: string;
  ctx: RouteContext;
}) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [form, setForm] = React.useState<MobileWorkflowTemplateInput>(() => defaultInput());
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<WorkflowFormStep>("basics");
  const loadedRef = React.useRef<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["mobile.workflow.detail", templateId],
    enabled: Boolean(templateId),
    queryFn: async () => {
      const res = await workflowService.detail(templateId!);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  });

  const agentsQuery = useQuery({
    queryKey: ["mobile.agents", session?.memberId],
    queryFn: async () => {
      const res = await agentService.list(session?.memberId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data.items;
    },
    staleTime: 30_000,
  });

  React.useEffect(() => {
    if (!detailQuery.data || loadedRef.current === detailQuery.data.id) return;
    loadedRef.current = detailQuery.data.id;
    setForm({
      name: detailQuery.data.name,
      scenarioType: detailQuery.data.scenarioType,
      version: detailQuery.data.version,
      triggerType: "manual",
      status: detailQuery.data.status,
      teamId: detailQuery.data.teamId ?? "",
      nodes: detailQuery.data.nodes,
    });
  }, [detailQuery.data]);

  const mutation = useMutation({
    mutationFn: async (input: MobileWorkflowTemplateInput) => {
      const res = templateId
        ? await workflowService.update(templateId, input)
        : await workflowService.create(input);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: async () => {
      haptic.weak();
      toast.success(templateId ? "模板已更新" : "模板已创建");
      await qc.invalidateQueries({ queryKey: ["mobile.workflows"] });
      ctx.goBack();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "保存失败");
    },
  });

  const agents = agentsQuery.data ?? [];
  const submitting = mutation.isPending;
  const stepIndex = WORKFLOW_FORM_STEPS.findIndex((item) => item.value === step);
  const isLastStep = stepIndex === WORKFLOW_FORM_STEPS.length - 1;
  const hasRoadmapNodes = form.nodes.some(
    (node) => node.type === "condition" || node.type === "parallel",
  );

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS.find((item) => item.key === presetKey);
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      scenarioType: preset.scenarioType,
      nodes: preset.nodes,
    }));
    setError(null);
  };

  const updateNode = (index: number, patch: Partial<MobileWorkflowTemplateNode>) => {
    setForm((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node, idx) => (idx === index ? { ...node, ...patch } : node)),
    }));
  };

  const addNode = (type: NodeType) => {
    setForm((prev) => ({
      ...prev,
      nodes: [...prev.nodes, createNode(type, prev.nodes.length + 1)],
    }));
  };

  const removeNode = (index: number) => {
    setForm((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((_, idx) => idx !== index),
    }));
  };

  const moveNode = (index: number, direction: -1 | 1) => {
    setForm((prev) => {
      const next = [...prev.nodes];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const current = next[index];
      const other = next[target];
      if (!current || !other) return prev;
      next[index] = other;
      next[target] = current;
      return { ...prev, nodes: next };
    });
  };

  const handleSubmit = () => {
    if (hasRoadmapNodes && form.status === "active") {
      setError("条件/并行节点当前仅支持保存为停用模板；执行引擎上线后再启用触发。");
      return;
    }
    const firstTask = form.nodes.find((node) => node.type === "task");
    if (!firstTask?.boundAgentId) {
      setError("请先为第一个任务节点绑定 Agent，App 触发流程时需要明确执行者。");
      return;
    }
    const parsed = mobileWorkflowTemplateInputSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "模板配置不完整");
      return;
    }
    setError(null);
    mutation.mutate(parsed.data);
  };

  const goNext = () => {
    const next = WORKFLOW_FORM_STEPS[stepIndex + 1]?.value;
    if (next) {
      setStep(next);
      haptic.weak();
    }
  };

  const goPrev = () => {
    const prev = WORKFLOW_FORM_STEPS[stepIndex - 1]?.value;
    if (prev) {
      setStep(prev);
      haptic.weak();
    }
  };

  if (templateId && detailQuery.isLoading) {
    return (
      <AppScreen>
        <AppBar title="编辑模板" onBack={ctx.goBack} />
        <LoadingState />
      </AppScreen>
    );
  }

  if (templateId && detailQuery.isError) {
    return (
      <AppScreen>
        <AppBar title="编辑模板" onBack={ctx.goBack} />
        <EmptyState
          tone="danger"
          title="模板加载失败"
          description={detailQuery.error instanceof Error ? detailQuery.error.message : ""}
          actionLabel="重试"
          onAction={() => void detailQuery.refetch()}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen padded={false}>
      <AppBar title={templateId ? "编辑模板" : "创建模板"} onBack={ctx.goBack} />
      <View style={styles.formShell}>
        <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
          <SegmentedControl<WorkflowFormStep>
            value={step}
            onChange={(next) => setStep(next)}
            options={WORKFLOW_FORM_STEPS}
            style={styles.stepTabs}
          />

          {step === "basics" ? (
            <>
              <SectionHeader eyebrow="workflow" title="基础信息" />
              <Card>
                <Field
                  label="模板名称"
                  value={form.name}
                  onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
                />
                <Field
                  label="业务场景"
                  value={form.scenarioType}
                  onChangeText={(scenarioType) => setForm((prev) => ({ ...prev, scenarioType }))}
                />
                <Field
                  label="版本"
                  value={form.version}
                  onChangeText={(version) => setForm((prev) => ({ ...prev, version }))}
                />
                <Typography variant="caption" tone="muted" style={styles.fieldLabel}>
                  状态
                </Typography>
                <SegmentedControl
                  value={form.status}
                  onChange={(status) => setForm((prev) => ({ ...prev, status }))}
                  options={[
                    { value: "active", label: "启用" },
                    { value: "inactive", label: "停用" },
                    { value: "archived", label: "归档" },
                  ]}
                />
              </Card>

              <SectionHeader eyebrow="preset" title="选择预设" style={styles.sectionGap} />
              <View style={styles.chipGrid}>
                {PRESETS.map((preset) => (
                  <Chip
                    key={preset.key}
                    label={preset.label}
                    active={form.scenarioType === preset.scenarioType}
                    onPress={() => applyPreset(preset.key)}
                  />
                ))}
              </View>
              {hasRoadmapNodes ? (
                <Card style={styles.noticeCard}>
                  <Typography variant="body" weight="semibold">
                    条件/并行节点为路线图能力
                  </Typography>
                  <Typography variant="caption" tone="muted" style={styles.paragraph}>
                    当前移动端可保存和展示这些节点，但后端执行引擎只支持线性流程触发。请将模板状态设为停用，或移除条件/并行节点后再启用。
                  </Typography>
                </Card>
              ) : null}
            </>
          ) : null}

          {step === "nodes" ? (
            <>
              <SectionHeader eyebrow="nodes" title={`节点编排 · ${form.nodes.length}`} />
              {form.nodes.map((node, index) => (
                <NodeEditor
                  key={`${node.key}-${index}`}
                  mode="structure"
                  index={index}
                  node={node}
                  agents={agents}
                  onChange={(patch) => updateNode(index, patch)}
                  onRemove={() => removeNode(index)}
                  onMoveUp={() => moveNode(index, -1)}
                  onMoveDown={() => moveNode(index, 1)}
                />
              ))}

              <View style={styles.addRow}>
                {NODE_TYPES.map((item) => (
                  <Chip
                    key={item.value}
                    label={`+${item.label}`}
                    onPress={() => addNode(item.value)}
                  />
                ))}
              </View>
            </>
          ) : null}

          {step === "agents" ? (
            <>
              <SectionHeader eyebrow="agents" title="绑定执行者" />
              {form.nodes.some((node) => node.type === "task" || node.type === "approval") ? (
                form.nodes.map((node, index) =>
                  node.type === "task" || node.type === "approval" ? (
                    <NodeEditor
                      key={`${node.key}-${index}`}
                      mode="agents"
                      index={index}
                      node={node}
                      agents={agents}
                      onChange={(patch) => updateNode(index, patch)}
                      onRemove={() => removeNode(index)}
                      onMoveUp={() => moveNode(index, -1)}
                      onMoveDown={() => moveNode(index, 1)}
                    />
                  ) : null,
                )
              ) : (
                <Card>
                  <Typography variant="body" tone="muted">
                    当前流程没有需要绑定 Agent 的节点。
                  </Typography>
                </Card>
              )}
            </>
          ) : null}

          {step === "rules" ? (
            <>
              <SectionHeader eyebrow="rules" title="条件与并行" />
              {hasRoadmapNodes ? (
                <Card style={styles.noticeCard}>
                  <Typography variant="caption" tone="muted">
                    这些规则会随模板保存；本版本不参与实际 Run 调度，不能以启用状态触发。
                  </Typography>
                </Card>
              ) : null}
              {form.nodes.some((node) => node.type === "condition" || node.type === "parallel") ? (
                form.nodes.map((node, index) =>
                  node.type === "condition" || node.type === "parallel" ? (
                    <NodeEditor
                      key={`${node.key}-${index}`}
                      mode="rules"
                      index={index}
                      node={node}
                      agents={agents}
                      onChange={(patch) => updateNode(index, patch)}
                      onRemove={() => removeNode(index)}
                      onMoveUp={() => moveNode(index, -1)}
                      onMoveDown={() => moveNode(index, 1)}
                    />
                  ) : null,
                )
              ) : (
                <Card>
                  <Typography variant="body" tone="muted">
                    当前流程没有条件或并行节点，可直接保存模板。
                  </Typography>
                </Card>
              )}
            </>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {error ? (
            <Typography variant="caption" tone="danger" style={styles.footerError}>
              {error}
            </Typography>
          ) : null}
          <View style={styles.footerActions}>
            {stepIndex > 0 ? (
              <Button label="上一步" variant="secondary" fullWidth onPress={goPrev} />
            ) : null}
            <Button
              label={isLastStep ? (templateId ? "保存模板" : "创建模板") : "下一步"}
              fullWidth
              loading={isLastStep && submitting}
              disabled={submitting}
              onPress={isLastStep ? handleSubmit : goNext}
            />
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

function NodeEditor({
  mode,
  index,
  node,
  agents,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  mode: NodeEditorMode;
  index: number;
  node: MobileWorkflowTemplateNode;
  agents: MobileAgentStatus[];
  onChange: (patch: Partial<MobileWorkflowTemplateNode>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const selectedAgent = agents.find((agent) => agent.id === node.boundAgentId);
  return (
    <Card style={styles.nodeCard}>
      <View style={styles.nodeHeader}>
        <View style={styles.nodeTitle}>
          <Typography variant="caption" tone="muted">
            节点 {index + 1}
          </Typography>
          <Typography variant="title" weight="semibold" numberOfLines={1}>
            {node.name || node.key}
          </Typography>
        </View>
        <StatusBadge
          label={typeLabel(node.type)}
          tone={node.type === "end" ? "neutral" : "accent"}
        />
      </View>

      {mode === "structure" ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalChips}
          >
            {NODE_TYPES.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                active={node.type === item.value}
                onPress={() =>
                  onChange({ ...createNode(item.value, index + 1), key: node.key, name: node.name })
                }
              />
            ))}
          </ScrollView>

          <Field label="节点 Key" value={node.key} onChangeText={(key) => onChange({ key })} />
          <Field label="节点名称" value={node.name} onChangeText={(name) => onChange({ name })} />
        </>
      ) : null}

      {mode === "agents" && (node.type === "task" || node.type === "approval") ? (
        <>
          <Typography variant="caption" tone="muted" style={styles.fieldLabel}>
            绑定 Agent
          </Typography>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalChips}
          >
            {agents.length === 0 ? (
              <Chip label="暂无 Agent" disabled />
            ) : (
              agents.map((agent) => (
                <Chip
                  key={agent.id}
                  label={agent.name}
                  active={node.boundAgentId === agent.id}
                  onPress={() =>
                    onChange({
                      boundAgentId: agent.id,
                      transport: agent.transport,
                      capabilityCode: node.capabilityCode || agent.capabilities[0] || "",
                    })
                  }
                />
              ))
            )}
          </ScrollView>
          {selectedAgent ? (
            <Typography variant="caption" tone="muted" style={styles.agentHint}>
              {selectedAgent.roleName} ·{" "}
              {selectedAgent.capabilities.slice(0, 3).join(" / ") || "未声明能力"}
            </Typography>
          ) : null}
          <Field
            label="能力编码"
            value={node.capabilityCode ?? ""}
            onChangeText={(capabilityCode) => onChange({ capabilityCode })}
          />
          <Typography variant="caption" tone="muted" style={styles.fieldLabel}>
            Transport
          </Typography>
          <View style={styles.chipGrid}>
            {TRANSPORTS.map((transport) => (
              <Chip
                key={transport.value}
                label={transport.label}
                active={(node.transport ?? "mock") === transport.value}
                onPress={() => onChange({ transport: transport.value })}
              />
            ))}
          </View>
        </>
      ) : null}

      {mode === "rules" && node.type === "condition" ? (
        <>
          <Field
            label="判断条件"
            value={node.predicate ?? ""}
            onChangeText={(predicate) => onChange({ predicate })}
          />
          <Field
            label="满足时进入"
            value={node.trueBranchKey ?? ""}
            onChangeText={(trueBranchKey) => onChange({ trueBranchKey })}
          />
          <Field
            label="不满足时进入"
            value={node.falseBranchKey ?? ""}
            onChangeText={(falseBranchKey) => onChange({ falseBranchKey })}
          />
        </>
      ) : null}

      {mode === "rules" && node.type === "parallel" ? (
        <>
          <Field
            label="并行分支 Key"
            value={(node.branchKeys ?? []).join(", ")}
            onChangeText={(value) =>
              onChange({
                branchKeys: value
                  .split(",")
                  .map((part) => part.trim())
                  .filter(Boolean),
              })
            }
          />
          <Typography variant="caption" tone="muted" style={styles.fieldLabel}>
            汇合策略
          </Typography>
          <SegmentedControl
            value={node.joinStrategy ?? "all"}
            onChange={(joinStrategy) => onChange({ joinStrategy })}
            options={[
              { value: "all", label: "全部完成" },
              { value: "any", label: "任一完成" },
            ]}
          />
        </>
      ) : null}

      {mode === "structure" ? (
        <View style={styles.nodeActions}>
          <Button label="上移" variant="ghost" size="sm" onPress={onMoveUp} />
          <Button label="下移" variant="ghost" size="sm" onPress={onMoveDown} />
          <Button label="删除" variant="danger" size="sm" onPress={onRemove} />
        </View>
      ) : null}
    </Card>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Typography variant="caption" tone="muted" style={styles.fieldLabel}>
        {label}
      </Typography>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={palette.textMuted}
        style={styles.input}
      />
    </View>
  );
}

function Chip({
  label,
  active = false,
  disabled = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Typography
        variant="caption"
        tone={active ? "accent" : "secondary"}
        weight="semibold"
        numberOfLines={1}
      >
        {label}
      </Typography>
    </Pressable>
  );
}

function createNode(type: NodeType, index: number): MobileWorkflowTemplateNode {
  const key = `${type}_${index}`;
  switch (type) {
    case "condition":
      return {
        key,
        type,
        name: "条件判断",
        predicate: "满足继续条件",
        trueBranchKey: "true_branch",
        falseBranchKey: "false_branch",
      };
    case "parallel":
      return {
        key,
        type,
        name: "并行处理",
        branchKeys: ["branch_a", "branch_b"],
        joinStrategy: "all",
      };
    case "approval":
      return { key, type, name: "人工审批" };
    case "end":
      return { key, type, name: "结束" };
    case "task":
    default:
      return {
        key,
        type: "task",
        name: "执行任务",
        capabilityCode: "general",
        transport: "openapi",
      };
  }
}

function typeLabel(type: NodeType): string {
  return NODE_TYPES.find((item) => item.value === type)?.label ?? type;
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.border,
    marginHorizontal: spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { backgroundColor: palette.bgSubtle },
  disabled: { opacity: 0.5 },
  formShell: { flex: 1 },
  formBody: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  stepTabs: {
    marginBottom: spacing.lg,
  },
  sectionGap: { marginTop: spacing.xl },
  noticeCard: { marginTop: spacing.lg },
  paragraph: { marginTop: spacing.xs },
  field: { marginTop: spacing.md },
  fieldLabel: { marginBottom: spacing.xs },
  input: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: palette.textPrimary,
    backgroundColor: palette.bgSurface,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  horizontalChips: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  chip: {
    minHeight: 44,
    maxWidth: 180,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    backgroundColor: palette.bgSurface,
  },
  chipActive: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  addRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  nodeCard: {
    marginBottom: spacing.lg,
  },
  nodeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  nodeTitle: { flex: 1, minWidth: 0 },
  agentHint: { marginTop: spacing.xs },
  nodeActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
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
  footerActions: {
    gap: spacing.sm,
  },
});
