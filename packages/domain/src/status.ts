export const projectStatuses = ["draft", "active", "paused", "delivered", "archived"] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export const agentStatuses = ["active", "inactive", "maintenance", "error"] as const;
export type AgentStatus = (typeof agentStatuses)[number];

export const agentOperatingStates = [
  "idle",
  "running",
  "waiting_review",
  "blocked",
  "offline",
] as const;
type AgentOperatingStateLabelKey = (typeof agentOperatingStates)[number];

export const workflowTemplateStatuses = ["active", "inactive", "archived"] as const;
export type WorkflowTemplateStatus = (typeof workflowTemplateStatuses)[number];

export const cycleStatuses = ["planned", "active", "completed", "archived"] as const;
export type CycleStatus = (typeof cycleStatuses)[number];

export const certificateStatuses = ["issued", "revoked", "superseded"] as const;
export type CertificateStatus = (typeof certificateStatuses)[number];

export const taskStatuses = [
  "triage",
  "backlog",
  "todo",
  "planned",
  "in_progress",
  "review",
  "waiting_approval",
  "blocked",
  "done",
  "completed",
  "delivered",
  "canceled",
] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const runStatuses = [
  "queued",
  "running",
  "waiting_approval",
  "succeeded",
  "failed",
  "cancelled",
  "timed_out",
] as const;
export type RunStatus = (typeof runStatuses)[number];

export const approvalDecisions = ["approved", "rejected", "cancelled"] as const;
export type ApprovalDecision = (typeof approvalDecisions)[number];

export const taskPriorities = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof taskPriorities)[number];

export const taskRelationTypes = ["blocks", "relates", "duplicates"] as const;
export type TaskRelationType = (typeof taskRelationTypes)[number];

export const themePreferences = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof themePreferences)[number];

export const executorTypes = ["mock", "openapi", "mcp-relay"] as const;
export type ExecutorType = (typeof executorTypes)[number];

export const objectStorageProviders = ["local-file", "s3-compatible"] as const;
export type ObjectStorageProvider = (typeof objectStorageProviders)[number];

export const notificationChannels = ["none", "wechat", "feishu", "wecom"] as const;
export type NotificationChannel = (typeof notificationChannels)[number];

export const approvalModes = ["manual", "assisted"] as const;
export type ApprovalMode = (typeof approvalModes)[number];

export const threadStatuses = ["open", "resolved"] as const;
export type ThreadStatus = (typeof threadStatuses)[number];

export const agentInstructionStatuses = [
  "queued",
  "running",
  "active",
  "awaiting_input",
  "completed",
  "failed",
  "cancelled",
  "stale",
] as const;
export type AgentInstructionStatus = (typeof agentInstructionStatuses)[number];

export const inboxItemKinds = [
  "assignment",
  "mention",
  "reply",
  "run",
  "approval",
  "awaiting_input",
  "failure",
  "proof_exception",
] as const;
export type InboxItemKind = (typeof inboxItemKinds)[number];

export const savedViewScopes = ["workspace", "team", "project", "my"] as const;
export type SavedViewScope = (typeof savedViewScopes)[number];

export const evidenceEntityTypes = [
  "project",
  "task",
  "message",
  "run",
  "agent-instruction",
  "certificate",
  "agent",
] as const;
export type EvidenceEntityType = (typeof evidenceEntityTypes)[number];

export const evidenceTrustStates = ["verified", "pending", "failed", "unavailable"] as const;
export type EvidenceTrustState = (typeof evidenceTrustStates)[number];

export const statusLabels: Record<ProjectStatus | TaskStatus | RunStatus, string> = {
  draft: "草稿",
  active: "进行中",
  paused: "已暂停",
  delivered: "已交付",
  archived: "已归档",
  triage: "分拣",
  backlog: "待排期",
  todo: "待办",
  planned: "待启动",
  in_progress: "进行中",
  review: "评审",
  waiting_approval: "待审批",
  blocked: "已阻塞",
  done: "已完成",
  completed: "已完成",
  canceled: "已取消",
  queued: "排队中",
  running: "运行中",
  succeeded: "已成功",
  failed: "已失败",
  cancelled: "已取消",
  timed_out: "已超时",
};

export const agentStatusLabels: Record<AgentStatus, string> = {
  active: "可用",
  inactive: "停用",
  maintenance: "维护中",
  error: "异常",
};

export const agentOperatingStateLabels: Record<AgentOperatingStateLabelKey, string> = {
  idle: "空闲",
  running: "执行中",
  waiting_review: "待复核",
  blocked: "阻塞",
  offline: "离线",
};

export const workflowTemplateStatusLabels: Record<WorkflowTemplateStatus, string> = {
  active: "启用中",
  inactive: "停用",
  archived: "已归档",
};

export const cycleStatusLabels: Record<CycleStatus, string> = {
  planned: "计划中",
  active: "当前周期",
  completed: "已完成",
  archived: "已归档",
};

export const certificateStatusLabels: Record<CertificateStatus, string> = {
  issued: "已签发",
  revoked: "已撤销",
  superseded: "已替换",
};

export const approvalDecisionLabels: Record<ApprovalDecision, string> = {
  approved: "已通过",
  rejected: "已驳回",
  cancelled: "已取消",
};

export const evidenceTrustStateLabels: Record<EvidenceTrustState, string> = {
  verified: "已核验",
  pending: "待核验",
  failed: "核验失败",
  unavailable: "暂无证据",
};

export const priorityLabels: Record<TaskPriority, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "紧急",
};

export function getStatusLabel(status: string): string {
  if (status in statusLabels) {
    return statusLabels[status as keyof typeof statusLabels];
  }

  if (status in agentStatusLabels) {
    return agentStatusLabels[status as keyof typeof agentStatusLabels];
  }

  if (status in agentOperatingStateLabels) {
    return agentOperatingStateLabels[status as keyof typeof agentOperatingStateLabels];
  }

  if (status in workflowTemplateStatusLabels) {
    return workflowTemplateStatusLabels[status as keyof typeof workflowTemplateStatusLabels];
  }

  if (status in cycleStatusLabels) {
    return cycleStatusLabels[status as keyof typeof cycleStatusLabels];
  }

  if (status in certificateStatusLabels) {
    return certificateStatusLabels[status as keyof typeof certificateStatusLabels];
  }

  if (status in approvalDecisionLabels) {
    return approvalDecisionLabels[status as keyof typeof approvalDecisionLabels];
  }

  if (status in evidenceTrustStateLabels) {
    return evidenceTrustStateLabels[status as keyof typeof evidenceTrustStateLabels];
  }

  if (status in priorityLabels) {
    return priorityLabels[status as keyof typeof priorityLabels];
  }

  return status;
}
