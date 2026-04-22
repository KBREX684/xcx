import type { WorkflowTemplateNode } from "./types";

export const DEMO_IDS = {
  workspaceId: "wrk_demo",
  ownerMemberId: "mem_owner",
  approverMemberId: "mem_approver",
  agentId: "agt_delivery",
  workflowTemplateId: "wft_mini_delivery",
  projectId: "prj_demo",
  taskId: "tsk_demo_seed"
} as const;

export const DEFAULT_WORKFLOW_TEMPLATE: {
  id: string;
  name: string;
  scenarioType: string;
  version: string;
  nodes: WorkflowTemplateNode[];
} = {
  id: DEMO_IDS.workflowTemplateId,
  name: "小程序项目交付流程（简化版）",
  scenarioType: "mini-program-delivery",
  version: "1.0.0",
  nodes: [
    {
      key: "implementation",
      type: "task",
      name: "需求实现任务",
      boundAgentId: DEMO_IDS.agentId
    },
    {
      key: "approval",
      type: "approval",
      name: "人工审批"
    },
    {
      key: "done",
      type: "end",
      name: "流程完成"
    }
  ]
};

