import type { ApprovalDecision, RunStatus, TaskStatus } from "./status";

export function taskStatusOnWorkflowTriggered(): TaskStatus {
  return "in_progress";
}

export function taskStatusOnRunCompleted(): TaskStatus {
  return "completed";
}

export function taskStatusOnApprovalRequested(): TaskStatus {
  return "waiting_approval";
}

export function applyApprovalDecision(decision: ApprovalDecision): {
  nextRunStatus: RunStatus;
  nextTaskStatus: TaskStatus;
  terminal: boolean;
} {
  if (decision === "approved") {
    return {
      nextRunStatus: "succeeded",
      nextTaskStatus: "completed",
      terminal: true,
    };
  }

  return {
    nextRunStatus: "failed",
    nextTaskStatus: "in_progress",
    terminal: true,
  };
}

export function isApprovalPending(status: RunStatus): boolean {
  return status === "waiting_approval";
}

export function isRunTerminal(status: RunStatus): boolean {
  return ["succeeded", "failed", "cancelled", "timed_out"].includes(status);
}
