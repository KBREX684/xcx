import type {
  AgentStatus,
  ApprovalDecision,
  ApprovalMode,
  CertificateStatus,
  ExecutorType,
  NotificationChannel,
  ObjectStorageProvider,
  ProjectStatus,
  RunStatus,
  TaskPriority,
  TaskStatus,
  ThemePreference,
  WorkflowTemplateStatus
} from "./status";

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

export interface CertificateSummary {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  status: CertificateStatus;
  verificationCode: string;
  generatedAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectSummary {
  ownerName: string;
  currentCertificateId: string | null;
  latestCertificate: CertificateSummary | null;
  latestEventSummary: string | null;
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

export interface RunListItem {
  id: string;
  status: RunStatus;
  agentName: string;
  taskTitle: string;
  outputSummary: string | null;
  traceId: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface TaskDetail extends TaskBoardItem {
  projectId: string;
  sourceTemplateName: string | null;
  createdAt: string;
  updatedAt: string;
  runs: RunListItem[];
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

export interface ArtifactDetail extends ArtifactListItem {
  projectId: string;
  projectName: string;
  runId: string;
  runStatus: RunStatus | null;
  outputSummary: string | null;
  metadata: Record<string, unknown> | null;
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

export interface ApprovalQueueItem {
  runId: string;
  taskId: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  taskTitle: string;
  agentName: string;
  requestedAt: string;
  outputSummary: string | null;
  traceId: string;
}

export interface ApprovalHistoryItem {
  runId: string;
  taskId: string;
  projectId: string;
  projectName: string;
  taskTitle: string;
  decision: ApprovalDecision;
  comment: string | null;
  approverName: string;
  decidedAt: string;
  traceId: string;
}

export interface ApprovalCenterData {
  pending: ApprovalQueueItem[];
  history: ApprovalHistoryItem[];
}

export interface RunDetail {
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  taskId: string;
  taskTitle: string;
  nodeKey: string;
  agentName: string;
  status: RunStatus;
  traceId: string;
  inputPayload: string | null;
  outputSummary: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  artifacts: ArtifactListItem[];
  approval: ApprovalRecord | null;
}

export interface AgentSummary {
  id: string;
  name: string;
  roleName: string;
  adapterType: string;
  status: AgentStatus;
  healthStatus: string;
  description: string;
  lastSeenAt: string | null;
  taskCount: number;
  runCount: number;
}

export interface AgentDetail extends AgentSummary {
  tags: string[];
  recentRuns: RunListItem[];
  ownedTasks: TaskBoardItem[];
}

export interface WorkflowTemplateListItem {
  id: string;
  name: string;
  scenarioType: string;
  version: string;
  triggerType: string;
  status: WorkflowTemplateStatus;
  nodeCount: number;
  usageCount: number;
  lastTriggeredAt: string | null;
}

export interface WorkflowTemplateDetail extends WorkflowTemplateListItem {
  nodes: WorkflowTemplateNode[];
}

export interface IntegrationConfigView {
  workspaceId: string;
  defaultExecutorType: ExecutorType;
  objectStorageProvider: ObjectStorageProvider;
  notificationChannel: NotificationChannel;
  callbackBaseUrl: string | null;
  agentEndpoint: string | null;
  approvalMode: ApprovalMode;
  updatedAt: string;
}

export interface DashboardSummary {
  workspaceName: string;
  totalProjectCount: number;
  activeProjectCount: number;
  pendingApprovalCount: number;
  runningExecutionCount: number;
  activeAgentCount: number;
  spotlightProjects: ProjectSummary[];
  pendingApprovals: ApprovalQueueItem[];
  recentEvents: EventTimelineItem[];
  certificateHighlights: CertificateSummary[];
}

export interface ProjectCockpit {
  project: ProjectDetail;
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

export interface ProjectSettingsInput {
  name: string;
  customerName: string;
  targetDeliveryAt?: string | null;
  status?: ProjectStatus;
}

export interface ApprovalDecisionInput {
  approverMemberId?: string;
  comment?: string;
}

export interface UpdateIntegrationConfigInput {
  defaultExecutorType: ExecutorType;
  objectStorageProvider: ObjectStorageProvider;
  notificationChannel: NotificationChannel;
  callbackBaseUrl?: string | null;
  agentEndpoint?: string | null;
  approvalMode: ApprovalMode;
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

export interface ThemeState {
  preference: ThemePreference;
  resolved: Exclude<ThemePreference, "system">;
}
