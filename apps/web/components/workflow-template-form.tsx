"use client";

import { useMemo, useState, type FormEvent } from "react";
import type {
  AgentSummary,
  ExecutorType,
  TeamSummary,
  WorkflowTemplateDetail,
  WorkflowTemplateNode,
} from "@agent-control-plane/domain";
import { createWorkflowTemplateAction, updateWorkflowTemplateAction } from "../app/actions";
import { BotIcon, CheckCircleIcon, PlusIcon, WorkflowIcon } from "./icons";

type WorkflowNodeType = WorkflowTemplateNode["type"];

type NodeDraft = {
  key: string;
  type: WorkflowNodeType;
  name: string;
  boundAgentId: string;
  capabilityCode: string;
  transport: ExecutorType | "";
  predicate: string;
  trueBranchKey: string;
  falseBranchKey: string;
  branchKeysText: string;
  joinStrategy: "all" | "any";
};

type PresetKind = "delivery" | "website" | "ops";
type BuilderStage = "basics" | "nodes" | "agents" | "rules" | "review";

const BUILDER_STAGES: Array<{ key: BuilderStage; label: string; description: string }> = [
  { key: "basics", label: "基础", description: "名称、场景、团队与预设" },
  { key: "nodes", label: "节点", description: "节点顺序与基础信息" },
  { key: "agents", label: "Agent", description: "执行者、能力与传输" },
  { key: "rules", label: "规则", description: "审批、条件与并行" },
  { key: "review", label: "检查", description: "预览配置并发布" },
];

const NODE_TYPE_OPTIONS: Array<{ value: WorkflowNodeType; label: string }> = [
  { value: "task", label: "Agent 执行" },
  { value: "approval", label: "人工审批" },
  { value: "condition", label: "条件分支" },
  { value: "parallel", label: "并行分派" },
  { value: "end", label: "结束" },
];

const TRANSPORT_OPTIONS: Array<{ value: ExecutorType; label: string }> = [
  { value: "mock", label: "Mock" },
  { value: "openapi", label: "OpenAPI" },
  { value: "mcp-relay", label: "MCP Relay" },
];

const SCENARIO_OPTIONS = [
  { value: "delivery", label: "交付项目" },
  { value: "website", label: "网站建设" },
  { value: "operations", label: "运营协作" },
  { value: "approval", label: "审批流" },
];

function slugify(input: string) {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "node";
}

function createNodeKey(base: string, nodes: NodeDraft[]) {
  const root = slugify(base);
  let candidate = root;
  let index = 2;
  const usedKeys = new Set(nodes.map((node) => node.key));

  while (usedKeys.has(candidate)) {
    candidate = `${root}-${index}`;
    index += 1;
  }

  return candidate;
}

function normalizeNode(node: WorkflowTemplateNode): NodeDraft {
  return {
    key: node.key,
    type: node.type,
    name: node.name,
    boundAgentId: node.boundAgentId ?? "",
    capabilityCode: node.capabilityCode ?? "",
    transport: node.transport ?? "",
    predicate: node.predicate ?? "",
    trueBranchKey: node.trueBranchKey ?? "",
    falseBranchKey: node.falseBranchKey ?? "",
    branchKeysText: node.branchKeys?.join(", ") ?? "",
    joinStrategy: node.joinStrategy ?? "all",
  };
}

function serializeNode(node: NodeDraft): WorkflowTemplateNode {
  const serialized: WorkflowTemplateNode = {
    key: node.key,
    type: node.type,
    name: node.name.trim(),
  };

  if (node.type === "task") {
    if (node.boundAgentId) serialized.boundAgentId = node.boundAgentId;
    if (node.capabilityCode.trim()) serialized.capabilityCode = node.capabilityCode.trim();
    serialized.transport = node.transport || null;
  }

  if (node.type === "condition") {
    if (node.predicate.trim()) serialized.predicate = node.predicate.trim();
    if (node.trueBranchKey.trim()) serialized.trueBranchKey = node.trueBranchKey.trim();
    if (node.falseBranchKey.trim()) serialized.falseBranchKey = node.falseBranchKey.trim();
  }

  if (node.type === "parallel") {
    const branchKeys = node.branchKeysText
      .split(",")
      .map((branch) => branch.trim())
      .filter(Boolean);
    if (branchKeys.length > 0) serialized.branchKeys = branchKeys;
    serialized.joinStrategy = node.joinStrategy;
  }

  return serialized;
}

function pickAgent(agents: AgentSummary[], keywords: string[]) {
  const lowerKeywords = keywords.map((keyword) => keyword.toLowerCase());
  return agents.find((agent) => {
    const haystack =
      `${agent.name} ${agent.roleName} ${agent.capabilities.join(" ")}`.toLowerCase();
    return lowerKeywords.some((keyword) => haystack.includes(keyword));
  });
}

function createTaskDraft(
  key: string,
  name: string,
  agents: AgentSummary[],
  keywords: string[],
): NodeDraft {
  const agent = pickAgent(agents, keywords);
  return {
    key,
    type: "task",
    name,
    boundAgentId: agent?.id ?? "",
    capabilityCode: agent?.capabilities[0] ?? "",
    transport: agent?.transport ?? "",
    predicate: "",
    trueBranchKey: "",
    falseBranchKey: "",
    branchKeysText: "",
    joinStrategy: "all",
  };
}

function createUtilityDraft(
  type: Exclude<WorkflowNodeType, "task">,
  key: string,
  name: string,
): NodeDraft {
  return {
    key,
    type,
    name,
    boundAgentId: "",
    capabilityCode: "",
    transport: "",
    predicate: "",
    trueBranchKey: "",
    falseBranchKey: "",
    branchKeysText: "",
    joinStrategy: "all",
  };
}

function createPresetNodes(kind: PresetKind, agents: AgentSummary[]): NodeDraft[] {
  if (kind === "website") {
    return [
      createTaskDraft("requirements", "需求澄清与验收标准", agents, ["requirements", "需求"]),
      createTaskDraft("planning", "页面结构与内容规划", agents, ["planning", "page", "规划"]),
      createTaskDraft("frontend", "前端实现与联调", agents, ["frontend", "前端"]),
      createTaskDraft("qa-review", "质量复核与回归", agents, ["qa", "quality", "测试"]),
      createUtilityDraft("approval", "customer-approval", "客户确认"),
      createUtilityDraft("end", "delivery-complete", "交付完成"),
    ];
  }

  if (kind === "ops") {
    return [
      createTaskDraft("intake", "收集输入与背景", agents, ["requirements", "需求"]),
      createTaskDraft("analysis", "方案分析与风险识别", agents, ["planning", "analysis", "规划"]),
      createTaskDraft("execution", "执行与结果整理", agents, ["frontend", "delivery", "执行"]),
      createUtilityDraft("approval", "owner-review", "负责人复核"),
      createUtilityDraft("end", "closed", "归档完成"),
    ];
  }

  return [
    createTaskDraft("intake", "需求受理", agents, ["requirements", "需求"]),
    createTaskDraft("plan", "交付计划", agents, ["planning", "规划"]),
    createTaskDraft("execute", "执行交付", agents, ["delivery", "frontend", "执行"]),
    createTaskDraft("verify", "验收复核", agents, ["qa", "quality", "测试"]),
    createUtilityDraft("approval", "approval", "人工审批"),
    createUtilityDraft("end", "done", "流程结束"),
  ];
}

function createBlankNode(
  type: WorkflowNodeType,
  nodes: NodeDraft[],
  agents: AgentSummary[],
): NodeDraft {
  if (type === "task") {
    const agent = agents[0];
    return {
      key: createNodeKey("agent-task", nodes),
      type,
      name: "新的 Agent 节点",
      boundAgentId: agent?.id ?? "",
      capabilityCode: agent?.capabilities[0] ?? "",
      transport: agent?.transport ?? "",
      predicate: "",
      trueBranchKey: "",
      falseBranchKey: "",
      branchKeysText: "",
      joinStrategy: "all",
    };
  }

  const defaults: Record<Exclude<WorkflowNodeType, "task">, string> = {
    approval: "人工审批",
    condition: "条件分支",
    parallel: "并行分派",
    end: "流程结束",
  };

  return createUtilityDraft(type, createNodeKey(type, nodes), defaults[type]);
}

function getNodeTypeLabel(type: WorkflowNodeType) {
  return NODE_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

function getTransportLabel(type: ExecutorType | "") {
  if (!type) return "未设置";
  return TRANSPORT_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function WorkflowTemplateForm({
  workflow,
  teams,
  agents,
}: {
  workflow?: WorkflowTemplateDetail;
  teams: TeamSummary[];
  agents: AgentSummary[];
}) {
  const [selectedTeamId, setSelectedTeamId] = useState(workflow?.teamId ?? "");
  const [nodes, setNodes] = useState<NodeDraft[]>(() =>
    workflow?.nodes?.length
      ? workflow.nodes.map(normalizeNode)
      : createPresetNodes("delivery", agents),
  );
  const [submitError, setSubmitError] = useState("");
  const [activeStage, setActiveStage] = useState<BuilderStage>("basics");

  const agentsById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const scenarioOptions = useMemo(() => {
    if (
      workflow?.scenarioType &&
      !SCENARIO_OPTIONS.some((option) => option.value === workflow.scenarioType)
    ) {
      return [{ value: workflow.scenarioType, label: workflow.scenarioType }, ...SCENARIO_OPTIONS];
    }
    return SCENARIO_OPTIONS;
  }, [workflow?.scenarioType]);

  const availableAgents = useMemo(() => {
    if (!selectedTeamId) return agents;
    const teamAgents = agents.filter((agent) =>
      agent.boundTeams.some((team) => team.id === selectedTeamId),
    );
    return teamAgents.length > 0 ? teamAgents : agents;
  }, [agents, selectedTeamId]);

  const nodesJson = useMemo(() => JSON.stringify(nodes.map(serializeNode), null, 2), [nodes]);
  const activeStageIndex = BUILDER_STAGES.findIndex((stage) => stage.key === activeStage);
  const nextStage = BUILDER_STAGES[activeStageIndex + 1]?.key;
  const previousStage = BUILDER_STAGES[activeStageIndex - 1]?.key;

  const validationMessage = useMemo(() => {
    if (nodes.length === 0) return "请至少保留一个流程节点。";
    if (nodes.some((node) => node.name.trim().length === 0)) return "节点名称不能为空。";
    if (!nodes.some((node) => node.type === "end")) return "请添加一个结束节点。";
    return "";
  }, [nodes]);

  function getAgentOptionsForNode(node: NodeDraft) {
    const currentAgent = node.boundAgentId ? agentsById.get(node.boundAgentId) : null;
    if (!currentAgent || availableAgents.some((agent) => agent.id === currentAgent.id)) {
      return availableAgents;
    }
    return [currentAgent, ...availableAgents];
  }

  function updateNode(key: string, patch: Partial<NodeDraft>) {
    setNodes((current) => current.map((node) => (node.key === key ? { ...node, ...patch } : node)));
  }

  function updateNodeAgent(key: string, agentId: string) {
    setNodes((current) =>
      current.map((node) => {
        if (node.key !== key) return node;
        const agent = agentsById.get(agentId);
        return {
          ...node,
          boundAgentId: agentId,
          capabilityCode: agent?.capabilities[0] ?? node.capabilityCode,
          transport: agent?.transport ?? node.transport,
        };
      }),
    );
  }

  function addNode(type: WorkflowNodeType) {
    setNodes((current) => {
      const newNode = createBlankNode(type, current, availableAgents);
      if (type === "end") return [...current, newNode];

      const endIndex = current.findIndex((node) => node.type === "end");
      if (endIndex === -1) return [...current, newNode];
      return [...current.slice(0, endIndex), newNode, ...current.slice(endIndex)];
    });
  }

  function removeNode(key: string) {
    setNodes((current) => current.filter((node) => node.key !== key));
  }

  function moveNode(key: string, direction: -1 | 1) {
    setNodes((current) => {
      const index = current.findIndex((node) => node.key === key);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const currentNode = next[index];
      const targetNode = next[nextIndex];
      if (!currentNode || !targetNode) return current;
      next[index] = targetNode;
      next[nextIndex] = currentNode;
      return next;
    });
  }

  function applyPreset(kind: PresetKind) {
    setNodes(createPresetNodes(kind, agents));
    setSubmitError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (validationMessage) {
      event.preventDefault();
      setSubmitError(validationMessage);
      return;
    }
    setSubmitError("");
  }

  function goToNextStage() {
    if (nextStage) setActiveStage(nextStage);
  }

  function goToPreviousStage() {
    if (previousStage) setActiveStage(previousStage);
  }

  return (
    <form
      action={workflow ? updateWorkflowTemplateAction : createWorkflowTemplateAction}
      className="workflow-builder"
      onSubmit={handleSubmit}
    >
      {workflow ? <input type="hidden" name="templateId" value={workflow.id} /> : null}
      {workflow ? (
        <input type="hidden" name="returnPath" value={`/workflows/${workflow.id}`} />
      ) : null}
      <input type="hidden" name="triggerType" value={workflow?.triggerType ?? "manual"} />
      <textarea name="nodes" value={nodesJson} readOnly hidden aria-hidden="true" />

      <nav className="workflow-stage-tabs" aria-label="流程模板编辑步骤">
        {BUILDER_STAGES.map((stage, index) => (
          <button
            key={stage.key}
            type="button"
            data-active={activeStage === stage.key ? "true" : "false"}
            onClick={() => setActiveStage(stage.key)}
          >
            <span>{index + 1}</span>
            <strong>{stage.label}</strong>
            <small>{stage.description}</small>
          </button>
        ))}
      </nav>

      <section className="workflow-builder-section" hidden={activeStage !== "basics"}>
        <div className="workflow-builder-section__head">
          <span className="workflow-builder-kicker">基础信息</span>
          <strong>模板属性</strong>
        </div>
        <label className="field-group">
          <span className="field-label">名称</span>
          <input
            name="name"
            className="field-control"
            defaultValue={workflow?.name ?? ""}
            placeholder="例如：官网交付流程"
            required
          />
        </label>
        <div className="grid-two">
          <label className="field-group">
            <span className="field-label">场景</span>
            <select
              name="scenarioType"
              className="field-control"
              defaultValue={workflow?.scenarioType ?? "delivery"}
            >
              {scenarioOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field-group">
            <span className="field-label">版本</span>
            <input
              name="version"
              className="field-control"
              defaultValue={workflow?.version ?? "1.0.0"}
            />
          </label>
        </div>
        <div className="grid-two">
          <label className="field-group">
            <span className="field-label">状态</span>
            <select
              name="status"
              className="field-control"
              defaultValue={workflow?.status ?? "active"}
            >
              <option value="active">启用中</option>
              <option value="inactive">停用</option>
              <option value="archived">已归档</option>
            </select>
          </label>
          <label className="field-group">
            <span className="field-label">团队</span>
            <select
              name="teamId"
              className="field-control"
              value={selectedTeamId}
              onChange={(event) => setSelectedTeamId(event.target.value)}
            >
              <option value="">工作区模板</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="workflow-builder-section" hidden={activeStage !== "basics"}>
        <div className="workflow-builder-section__head workflow-builder-section__head--split">
          <div>
            <span className="workflow-builder-kicker">快速套用</span>
            <strong>流程骨架</strong>
          </div>
          <WorkflowIcon />
        </div>
        <div className="workflow-builder-presets">
          <button
            type="button"
            className="ghost-button ghost-button--compact"
            onClick={() => applyPreset("delivery")}
          >
            通用交付
          </button>
          <button
            type="button"
            className="ghost-button ghost-button--compact"
            onClick={() => applyPreset("website")}
          >
            网站建设
          </button>
          <button
            type="button"
            className="ghost-button ghost-button--compact"
            onClick={() => applyPreset("ops")}
          >
            运营协作
          </button>
        </div>
      </section>

      <section
        className="workflow-builder-section"
        hidden={!["nodes", "agents", "rules"].includes(activeStage)}
      >
        <div className="workflow-builder-section__head workflow-builder-section__head--split">
          <div>
            <span className="workflow-builder-kicker">节点编排</span>
            <strong>{nodes.length} 个节点</strong>
          </div>
          <div className="workflow-node-add" hidden={activeStage !== "nodes"}>
            <button
              type="button"
              className="ghost-button ghost-button--compact"
              onClick={() => addNode("task")}
            >
              <PlusIcon /> Agent
            </button>
            <button
              type="button"
              className="ghost-button ghost-button--compact"
              onClick={() => addNode("approval")}
            >
              审批
            </button>
            <button
              type="button"
              className="ghost-button ghost-button--compact"
              onClick={() => addNode("end")}
            >
              结束
            </button>
          </div>
        </div>

        <div className="workflow-node-list">
          {nodes.map((node, index) => {
            const selectedAgent = node.boundAgentId ? agentsById.get(node.boundAgentId) : null;
            const capabilityOptions = selectedAgent?.capabilities ?? [];
            const capabilityValues = node.capabilityCode
              ? Array.from(new Set([node.capabilityCode, ...capabilityOptions]))
              : capabilityOptions;

            return (
              <article key={node.key} className="workflow-node-card">
                <div className="workflow-node-card__head">
                  <div className="workflow-node-index">{index + 1}</div>
                  <div className="workflow-node-title">
                    <strong>{node.name || "未命名节点"}</strong>
                    <span>
                      {getNodeTypeLabel(node.type)}
                      {node.type === "task" ? ` · ${selectedAgent?.name ?? "未绑定智能体"}` : ""}
                    </span>
                  </div>
                  <div className="workflow-node-actions" hidden={activeStage !== "nodes"}>
                    <button
                      type="button"
                      className="ghost-button ghost-button--compact"
                      onClick={() => moveNode(node.key, -1)}
                      disabled={index === 0}
                    >
                      上移
                    </button>
                    <button
                      type="button"
                      className="ghost-button ghost-button--compact"
                      onClick={() => moveNode(node.key, 1)}
                      disabled={index === nodes.length - 1}
                    >
                      下移
                    </button>
                    <button
                      type="button"
                      className="ghost-button ghost-button--compact workflow-danger-button"
                      onClick={() => removeNode(node.key)}
                      disabled={nodes.length <= 1}
                    >
                      删除
                    </button>
                  </div>
                </div>

                <div className="workflow-node-card__grid">
                  {activeStage === "nodes" ? (
                    <>
                      <label className="field-group">
                        <span className="field-label">节点名称</span>
                        <input
                          className="field-control"
                          value={node.name}
                          onChange={(event) => updateNode(node.key, { name: event.target.value })}
                        />
                      </label>
                      <label className="field-group">
                        <span className="field-label">类型</span>
                        <select
                          className="field-control"
                          value={node.type}
                          onChange={(event) =>
                            updateNode(node.key, { type: event.target.value as WorkflowNodeType })
                          }
                        >
                          {NODE_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : null}

                  {activeStage === "agents" && node.type === "task" ? (
                    <>
                      <label className="field-group">
                        <span className="field-label">绑定 Agent</span>
                        <select
                          className="field-control"
                          value={node.boundAgentId}
                          onChange={(event) => updateNodeAgent(node.key, event.target.value)}
                        >
                          <option value="">未绑定</option>
                          {getAgentOptionsForNode(node).map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name} · {agent.roleName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field-group">
                        <span className="field-label">能力</span>
                        {capabilityValues.length > 0 ? (
                          <select
                            className="field-control"
                            value={node.capabilityCode}
                            onChange={(event) =>
                              updateNode(node.key, { capabilityCode: event.target.value })
                            }
                          >
                            <option value="">不指定</option>
                            {capabilityValues.map((capability) => (
                              <option key={capability} value={capability}>
                                {capability}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="field-control"
                            value={node.capabilityCode}
                            onChange={(event) =>
                              updateNode(node.key, { capabilityCode: event.target.value })
                            }
                            placeholder="例如 delivery-review"
                          />
                        )}
                      </label>
                      <label className="field-group">
                        <span className="field-label">传输</span>
                        <select
                          className="field-control"
                          value={node.transport}
                          onChange={(event) =>
                            updateNode(node.key, {
                              transport: event.target.value as ExecutorType | "",
                            })
                          }
                        >
                          <option value="">跟随 Agent</option>
                          {TRANSPORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="workflow-node-summary">
                        <BotIcon />
                        <span>{getTransportLabel(node.transport)}</span>
                      </div>
                    </>
                  ) : null}

                  {activeStage === "agents" && node.type !== "task" ? (
                    <div className="workflow-node-summary workflow-node-summary--wide">
                      <CheckCircleIcon />
                      <span>该节点不需要绑定 Agent。</span>
                    </div>
                  ) : null}

                  {activeStage === "rules" && node.type === "condition" ? (
                    <>
                      <label className="field-group">
                        <span className="field-label">条件</span>
                        <input
                          className="field-control"
                          value={node.predicate}
                          onChange={(event) =>
                            updateNode(node.key, { predicate: event.target.value })
                          }
                          placeholder="例如 approvalRequired == true"
                        />
                      </label>
                      <label className="field-group">
                        <span className="field-label">通过分支</span>
                        <input
                          className="field-control"
                          value={node.trueBranchKey}
                          onChange={(event) =>
                            updateNode(node.key, { trueBranchKey: event.target.value })
                          }
                        />
                      </label>
                      <label className="field-group">
                        <span className="field-label">未通过分支</span>
                        <input
                          className="field-control"
                          value={node.falseBranchKey}
                          onChange={(event) =>
                            updateNode(node.key, { falseBranchKey: event.target.value })
                          }
                        />
                      </label>
                    </>
                  ) : null}

                  {activeStage === "rules" && node.type === "parallel" ? (
                    <>
                      <label className="field-group workflow-node-wide-field">
                        <span className="field-label">并行节点 Key</span>
                        <input
                          className="field-control"
                          value={node.branchKeysText}
                          onChange={(event) =>
                            updateNode(node.key, { branchKeysText: event.target.value })
                          }
                          placeholder="用英文逗号分隔"
                        />
                      </label>
                      <label className="field-group">
                        <span className="field-label">汇合策略</span>
                        <select
                          className="field-control"
                          value={node.joinStrategy}
                          onChange={(event) =>
                            updateNode(node.key, {
                              joinStrategy: event.target.value as NodeDraft["joinStrategy"],
                            })
                          }
                        >
                          <option value="all">全部完成</option>
                          <option value="any">任一完成</option>
                        </select>
                      </label>
                    </>
                  ) : null}

                  {activeStage === "rules" &&
                  (node.type === "approval" || node.type === "end" || node.type === "task") ? (
                    <div className="workflow-node-summary workflow-node-summary--wide">
                      <CheckCircleIcon />
                      <span>
                        {node.type === "approval"
                          ? "等待人工确认后继续。"
                          : node.type === "end"
                            ? "流程到此结束。"
                            : "普通任务节点没有条件或并行规则。"}
                      </span>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <details className="workflow-json-panel" hidden={activeStage !== "review"}>
        <summary>高级 JSON 预览</summary>
        <pre className="code-block">{nodesJson}</pre>
      </details>

      {submitError ? <p className="workflow-validation">{submitError}</p> : null}

      <div className="workflow-builder-footer">
        {previousStage ? (
          <button type="button" className="ghost-button" onClick={goToPreviousStage}>
            上一步
          </button>
        ) : null}
        {nextStage ? (
          <button type="button" className="action-button" onClick={goToNextStage}>
            下一步
          </button>
        ) : (
          <button type="submit" className="action-button">
            {workflow ? "更新模板" : "创建模板"}
          </button>
        )}
      </div>
    </form>
  );
}
