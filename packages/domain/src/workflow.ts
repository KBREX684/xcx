import type { WorkflowTemplateNode } from "./types";

export const DEMO_IDS = {
  workspaceId: "wrk_opc_pilot",
  projectManagerMemberId: "mem_opc_pm",
  developerMemberId: "mem_opc_dev",
  approverMemberId: "mem_opc_approver",
  customerMemberId: "mem_customer",
  deliveryTeamId: "team_delivery_command",
  engineeringTeamId: "team_build_engineering",
  qaTeamId: "team_quality_review",
  requirementsAgentId: "agt_requirements",
  pagePlanningAgentId: "agt_page_planning",
  frontendAgentId: "agt_frontend",
  qaAgentId: "agt_qa",
  docsAgentId: "agt_docs",
  workflowTemplateId: "wft_event_signup_delivery",
  projectId: "prj_event_signup",
  initialTaskId: "tsk_requirements_seed",
} as const;

export const DEFAULT_WORKFLOW_TEMPLATE: {
  id: string;
  name: string;
  scenarioType: string;
  version: string;
  nodes: WorkflowTemplateNode[];
} = {
  id: DEMO_IDS.workflowTemplateId,
  name: "活动报名小程序交付流程 v1",
  scenarioType: "event-signup-mini-program",
  version: "3.0.0",
  nodes: [
    {
      key: "requirements",
      type: "task",
      name: "需求整理",
      boundAgentId: DEMO_IDS.requirementsAgentId,
      capabilityCode: "requirements-analysis",
      transport: "openapi",
    },
    {
      key: "page-plan",
      type: "task",
      name: "页面方案",
      boundAgentId: DEMO_IDS.pagePlanningAgentId,
      capabilityCode: "page-planning",
      transport: "openapi",
    },
    {
      key: "frontend-build",
      type: "task",
      name: "前端实现",
      boundAgentId: DEMO_IDS.frontendAgentId,
      capabilityCode: "frontend-implementation",
      transport: "openapi",
    },
    {
      key: "qa-regression",
      type: "task",
      name: "测试回归",
      boundAgentId: DEMO_IDS.qaAgentId,
      capabilityCode: "quality-regression",
      transport: "mcp-relay",
    },
    {
      key: "delivery-docs",
      type: "task",
      name: "交付文档",
      boundAgentId: DEMO_IDS.docsAgentId,
      capabilityCode: "delivery-documentation",
      transport: "openapi",
    },
    {
      key: "approval",
      type: "approval",
      name: "人工审批",
    },
    {
      key: "done",
      type: "end",
      name: "流程完成",
    },
  ],
};

/**
 * Built-in workflow templates beyond the primary delivery flow.
 * Required by PRD §6.1.D ("至少支持 3 个内置模板场景") and §7
 * (delivery / weekly ops analysis / outsourced phase report).
 *
 * These templates are seeded via prisma/seed.ts and are intentionally
 * lightweight — they bind the same agent registry as the delivery flow
 * so any tenant can start running them without extra agent registration.
 */
export const WEEKLY_OPS_ANALYSIS_TEMPLATE: {
  id: string;
  name: string;
  scenarioType: string;
  version: string;
  nodes: WorkflowTemplateNode[];
} = {
  id: "wft_weekly_ops_analysis",
  name: "每周运营分析流程 v1",
  scenarioType: "weekly-ops-analysis",
  version: "1.0.0",
  nodes: [
    {
      key: "data-pull",
      type: "task",
      name: "数据 Agent 拉取本周数据",
      boundAgentId: DEMO_IDS.requirementsAgentId,
      capabilityCode: "requirements-analysis",
      transport: "openapi",
    },
    {
      key: "insight",
      type: "task",
      name: "分析 Agent 生成洞察",
      boundAgentId: DEMO_IDS.pagePlanningAgentId,
      capabilityCode: "page-planning",
      transport: "openapi",
    },
    {
      key: "weekly-report",
      type: "task",
      name: "内容 Agent 生成周报",
      boundAgentId: DEMO_IDS.docsAgentId,
      capabilityCode: "delivery-documentation",
      transport: "openapi",
    },
    {
      key: "human-confirm",
      type: "approval",
      name: "人工确认",
    },
    {
      key: "done",
      type: "end",
      name: "周报已发送",
    },
  ],
};

export const PHASE_REPORT_TEMPLATE: {
  id: string;
  name: string;
  scenarioType: string;
  version: string;
  nodes: WorkflowTemplateNode[];
} = {
  id: "wft_phase_report",
  name: "外包项目阶段汇报流程 v1",
  scenarioType: "outsourced-phase-report",
  version: "1.0.0",
  nodes: [
    {
      key: "weekly-snapshot",
      type: "task",
      name: "拉取本周任务与产物",
      boundAgentId: DEMO_IDS.requirementsAgentId,
      capabilityCode: "requirements-analysis",
      transport: "openapi",
    },
    {
      key: "agent-contributions",
      type: "task",
      name: "汇总 Agent 贡献",
      boundAgentId: DEMO_IDS.pagePlanningAgentId,
      capabilityCode: "page-planning",
      transport: "openapi",
    },
    {
      key: "phase-report",
      type: "task",
      name: "生成阶段汇报",
      boundAgentId: DEMO_IDS.docsAgentId,
      capabilityCode: "delivery-documentation",
      transport: "openapi",
    },
    {
      key: "approval",
      type: "approval",
      name: "人工审批",
    },
    {
      key: "done",
      type: "end",
      name: "阶段汇报已归档",
    },
  ],
};

export const BUILTIN_WORKFLOW_TEMPLATES = [
  DEFAULT_WORKFLOW_TEMPLATE,
  WEEKLY_OPS_ANALYSIS_TEMPLATE,
  PHASE_REPORT_TEMPLATE,
] as const;
