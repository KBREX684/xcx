export const projectStatuses = ["draft", "active", "paused", "delivered", "archived"] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

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

