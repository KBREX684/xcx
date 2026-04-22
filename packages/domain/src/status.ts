export const projectStatuses = ["draft", "active", "paused", "delivered", "archived"] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export const agentStatuses = ["active", "inactive", "maintenance", "error"] as const;
export type AgentStatus = (typeof agentStatuses)[number];

export const workflowTemplateStatuses = ["active", "inactive", "archived"] as const;
export type WorkflowTemplateStatus = (typeof workflowTemplateStatuses)[number];

export const certificateStatuses = ["ready", "generating", "archived"] as const;
export type CertificateStatus = (typeof certificateStatuses)[number];

export const taskStatuses = [
  "backlog",
  "planned",
  "in_progress",
  "waiting_approval",
  "blocked",
  "completed",
  "delivered"
] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const runStatuses = [
  "queued",
  "running",
  "waiting_approval",
  "succeeded",
  "failed",
  "cancelled",
  "timed_out"
] as const;
export type RunStatus = (typeof runStatuses)[number];

export const approvalDecisions = ["approved", "rejected", "cancelled"] as const;
export type ApprovalDecision = (typeof approvalDecisions)[number];

export const taskPriorities = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof taskPriorities)[number];

export const themePreferences = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof themePreferences)[number];

export const executorTypes = ["mock", "openapi"] as const;
export type ExecutorType = (typeof executorTypes)[number];

export const objectStorageProviders = ["local-file", "s3-compatible"] as const;
export type ObjectStorageProvider = (typeof objectStorageProviders)[number];

export const notificationChannels = ["none", "wechat", "feishu", "wecom"] as const;
export type NotificationChannel = (typeof notificationChannels)[number];

export const approvalModes = ["manual", "assisted"] as const;
export type ApprovalMode = (typeof approvalModes)[number];

export const statusLabels: Record<ProjectStatus | TaskStatus | RunStatus, string> = {
  draft: "草稿",
  active: "进行中",
  paused: "暂停",
  delivered: "已交付",
  archived: "归档",
  backlog: "待整理",
  planned: "待启动",
  in_progress: "执行中",
  waiting_approval: "待审批",
  blocked: "阻塞",
  completed: "已完成",
  queued: "排队中",
  running: "运行中",
  succeeded: "已成功",
  failed: "已失败",
  cancelled: "已取消",
  timed_out: "已超时"
};

export const agentStatusLabels: Record<AgentStatus, string> = {
  active: "可用",
  inactive: "停用",
  maintenance: "维护中",
  error: "异常"
};

export const workflowTemplateStatusLabels: Record<WorkflowTemplateStatus, string> = {
  active: "启用中",
  inactive: "停用",
  archived: "归档"
};

export const certificateStatusLabels: Record<CertificateStatus, string> = {
  ready: "已生成",
  generating: "生成中",
  archived: "已归档"
};

export const approvalDecisionLabels: Record<ApprovalDecision, string> = {
  approved: "已通过",
  rejected: "已驳回",
  cancelled: "已取消"
};

export function getStatusLabel(status: string): string {
  if (status in statusLabels) {
    return statusLabels[status as keyof typeof statusLabels];
  }

  if (status in agentStatusLabels) {
    return agentStatusLabels[status as keyof typeof agentStatusLabels];
  }

  if (status in workflowTemplateStatusLabels) {
    return workflowTemplateStatusLabels[status as keyof typeof workflowTemplateStatusLabels];
  }

  if (status in certificateStatusLabels) {
    return certificateStatusLabels[status as keyof typeof certificateStatusLabels];
  }

  if (status in approvalDecisionLabels) {
    return approvalDecisionLabels[status as keyof typeof approvalDecisionLabels];
  }

  return status;
}
