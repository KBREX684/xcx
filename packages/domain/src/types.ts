import type { ApprovalDecision, ProjectStatus, RunStatus, TaskPriority, TaskStatus } from "./status";

export interface WorkflowTemplateNode {
  key: string;
  type: "task" | "approval" | "end";
  name: string;
  boundAgentId?: string;
}

export interface WorkflowTemplateSummary {
  id: string;
  name: string;
  scenarioType: string;
  version: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  projectCode: string;
  customerName: string;
  status: ProjectStatus;
  targetDeliveryAt: string | null;
  taskCount: number;
  completedTaskCount: number;
  latestRunStatus: RunStatus | null;
  pendingApprovalCount: number;
  lastEventAt: string | null;
}

export interface TaskBoardItem {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  ownerLabel: string;
  dueAt: string | null;
  blockedReason: string | null;
  currentRunId: string | null;
  currentRunStatus: RunStatus | null;
  latestOutputSummary: string | null;
}

export interface ArtifactListItem {
  id: string;
  title: string;
  artifactType: string;
  storageUri: string;
  mimeType: string;
  sha256Digest: string;
  createdAt: string;
}

export interface EventTimelineItem {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId: string;
  traceId: string;
  occurredAt: string;
  summary: string;
}

export interface ApprovalRecord {
  decision: ApprovalDecision;
  comment: string | null;
  approverName: string;
  decidedAt: string;
}

export interface RunDetail {
  id: string;
  projectId: string;
  taskId: string;
  nodeKey: string;
  agentName: string;
  status: RunStatus;
  traceId: string;
  outputSummary: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  artifacts: ArtifactListItem[];
  approval: ApprovalRecord | null;
}

export interface ProjectCockpit {
  project: ProjectSummary;
  template: WorkflowTemplateSummary;
  tasks: TaskBoardItem[];
  currentRun: RunDetail | null;
  artifacts: ArtifactListItem[];
  events: EventTimelineItem[];
}

export interface CreateProjectInput {
  name: string;
  customerName: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  priority?: TaskPriority;
}

export interface ApprovalDecisionInput {
  approverMemberId?: string;
  comment?: string;
}

export interface MiniAppApprovalItem {
  runId: string;
  projectId: string;
  projectName: string;
  taskTitle: string;
  outputSummary: string | null;
  requestedAt: string;
}

export interface MiniAppProjectSummary {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  pendingApprovalCount: number;
  latestRunStatus: RunStatus | null;
}

export interface MiniAppRunSummary {
  runId: string;
  status: RunStatus;
  taskTitle: string;
  outputSummary: string | null;
  traceId: string;
}

