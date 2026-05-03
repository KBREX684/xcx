import type {
  AgentInstructionStatus,
  AgentStatus,
  ApprovalDecision,
  ApprovalMode,
  CertificateStatus,
  CycleStatus,
  ExecutorType,
  InboxItemKind,
  NotificationChannel,
  ObjectStorageProvider,
  ProjectStatus,
  RunStatus,
  SavedViewScope,
  TaskPriority,
  TaskRelationType,
  TaskStatus,
  ThemePreference,
  ThreadStatus,
  EvidenceEntityType,
  EvidenceTrustState,
  WorkflowTemplateStatus,
} from "./status";

export type AgentOperatingState = "idle" | "running" | "waiting_review" | "blocked" | "offline";

export interface WorkflowTemplateNode {
  key: string;
  /**
   * Node category in the workflow DAG.
   *   - `task`      — agent or human work item.
   *   - `approval`  — gated approval step.
   *   - `condition` — predicate-based branch; routes to `trueBranchKey` /
   *                   `falseBranchKey` based on `predicate` evaluation.
   *   - `parallel`  — fan-out to `branchKeys`; rejoin obeys `joinStrategy`.
   *   - `end`       — terminal node.
   */
  type: "task" | "approval" | "condition" | "parallel" | "end";
  name: string;
  boundAgentId?: string;
  capabilityCode?: string;
  transport?: ExecutorType | null;
  // --- DAG branching (set only when `type === "condition"`) -----------------
  predicate?: string;
  trueBranchKey?: string;
  falseBranchKey?: string;
  // --- DAG fan-out  (set only when `type === "parallel"`)  ------------------
  branchKeys?: string[];
  joinStrategy?: "all" | "any";
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
  description: string | null;
  ownerName: string;
  teamId: string | null;
  teamName: string | null;
  status: ProjectStatus;
  health: string;
  priority: string;
  targetDeliveryAt: string | null;
  taskCount: number;
  completedTaskCount: number;
  latestRunStatus: RunStatus | null;
  pendingApprovalCount: number;
  lastEventAt: string | null;
  currentNodeKey: string | null;
  currentNodeName: string | null;
  latestCertificateStatus: CertificateStatus | null;
}

export interface TeamSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  leadName: string | null;
  triageEnabled: boolean;
  issueStatuses: string[];
  agentGuidance: string | null;
  agentCount: number;
  activeAgentCount: number;
  projectCount: number;
  runningExecutionCount: number;
  cycles: CycleSummary[];
  updatedAt: string;
}

export interface TeamBindingItem {
  teamId: string;
  agentId: string;
  agentName: string;
  roleName: string;
  transport: ExecutorType;
  status: AgentStatus;
  healthStatus: string;
  capabilities: string[];
}

export interface TeamProjectItem {
  id: string;
  name: string;
  projectCode: string;
  status: ProjectStatus;
  lastEventAt: string | null;
}

export interface TeamDetail extends TeamSummary {
  leadMemberId: string | null;
  bindings: TeamBindingItem[];
  projects: TeamProjectItem[];
  cycles: CycleSummary[];
}

export interface CycleSummary {
  id: string;
  workspaceId: string;
  teamId: string;
  teamName: string;
  name: string;
  status: CycleStatus;
  startsAt: string;
  endsAt: string;
  issueCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateSummary {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  status: CertificateStatus;
  certificateNo: string;
  version: number;
  verificationCode: string;
  digestSha256: string;
  verificationUrl: string;
  chainHeadHash: string;
  issuedAt: string;
  revokedAt: string | null;
  updatedAt: string;
  replacedByCertificateId: string | null;
}

export interface CertificateVerificationLog {
  id: string;
  verificationCode: string;
  outcome: string;
  traceId: string;
  verifierIp: string | null;
  verifierUserAgent: string | null;
  verifiedAt: string;
}

export interface CertificateDetail extends CertificateSummary {
  signature: string;
  jsonStorageUri: string;
  htmlStorageUri: string;
  pdfStorageUri: string | null;
  acceptanceComment: string | null;
  acceptedAt: string | null;
  summary: Record<string, unknown> | null;
  verificationRecords: CertificateVerificationLog[];
}

export interface CertificateVerificationResult {
  certificateId: string;
  projectId: string;
  projectName: string;
  title: string;
  status: CertificateStatus;
  certificateNo: string;
  version: number;
  verificationCode: string;
  digestValid: boolean;
  signatureValid: boolean;
  chainValid: boolean;
  artifactDigestValid: boolean;
  acceptedAt: string | null;
  revokedAt: string | null;
  verificationUrl: string;
  chainHeadHash: string;
  latestAnchor?: ChainAnchorSummary | null;
}

/**
 * Public, downloadable proof bundle for a certificate verification.
 * Returned by GET /api/v1/certificates/verify/:code/proof — anyone holding
 * a valid verificationCode may fetch this; it is the offline-verifiable
 * counterpart to the live verify page.
 */
export interface CertificateProofBundle {
  generatedAt: string;
  result: CertificateVerificationResult;
  digestSha256: string;
  signature: string;
  signingKeyVersion: string | null;
  signingPublicKeyHex: string | null;
  signatureAlgorithm: "Ed25519" | "HMAC-SHA256-dev" | "unknown";
  events: Array<{
    sequenceNo: number | null;
    eventType: string;
    occurredAt: string;
    actorType: string;
    actorId: string;
    payloadDigest: string | null;
    prevEventHash: string | null;
    eventHash: string | null;
  }>;
}

export interface ProjectDetail extends ProjectSummary {
  currentCertificateId: string | null;
  latestCertificate: CertificateSummary | null;
  latestEventSummary: string | null;
  hashChainHealthy: boolean;
  chainHeadHash: string | null;
}

export interface TaskBoardItem {
  id: string;
  projectId: string;
  parentId: string | null;
  cycleId: string | null;
  cycleName: string | null;
  depth: number;
  childCount: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  ownerLabel: string;
  ownerMemberId: string | null;
  ownerMemberName: string | null;
  delegateAgentId: string | null;
  delegateAgentName: string | null;
  assignedByMemberId: string | null;
  assignedByName: string | null;
  assignedAt: string | null;
  dueAt: string | null;
  blockedReason: string | null;
  currentRunId: string | null;
  currentRunStatus: RunStatus | null;
  latestOutputSummary: string | null;
  nodeKey: string | null;
  capabilityCode: string | null;
  sequenceNo: number;
  waitingHumanReview: boolean;
  lastConversationAt: string | null;
  latestMessagePreview: string | null;
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
  executorType: ExecutorType;
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  agentId: string;
  agentName: string;
  assignedByMemberId: string;
  assignedByName: string;
  assignedAt: string;
  note: string | null;
}

export interface ConversationMessage {
  id: string;
  threadId: string;
  taskId: string;
  authorType: "member" | "agent" | "system" | "worker";
  authorId: string;
  authorName: string;
  body: string;
  replyToMessageId: string | null;
  mentionAgentIds: string[];
  instructionId: string | null;
  instructionIds: string[];
  isSystemGenerated: boolean;
  createdAt: string;
  editedAt: string | null;
  originalBody: string | null;
  editedByMemberId: string | null;
}

export interface ConversationMessageArtifact {
  id: string;
  title: string;
  artifactType: string;
  storageUri: string;
  objectStorageBucket: string | null;
  objectKey: string | null;
  contentSha256: string | null;
  mimeType: string;
  sha256Digest: string;
  createdAt: string;
  contents: string | null;
}

export interface ConversationMessageRelatedRun {
  id: string;
  agentName: string;
  status: RunStatus;
  nodeKey: string;
  outputSummary: string | null;
  traceId: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  artifacts: ConversationMessageArtifact[];
}

export interface ConversationMessageDetail extends ConversationMessage {
  projectId: string;
  projectName: string;
  projectCode: string;
  taskTitle: string;
  replyToMessage: ConversationMessage | null;
  relatedRuns: ConversationMessageRelatedRun[];
}

export interface AgentInstruction {
  id: string;
  taskId: string;
  threadId: string;
  messageId: string;
  agentId: string;
  agentName: string;
  runId: string | null;
  status: AgentInstructionStatus;
  prompt: string;
  responseSummary: string | null;
  activitySummary: string | null;
  planSummary: string | null;
  awaitingInputReason: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ConversationThread {
  id: string;
  taskId: string;
  status: ThreadStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedByName: string | null;
  messages: ConversationMessage[];
  pendingInstructions: AgentInstruction[];
}

export interface AssignableAgentOption {
  id: string;
  name: string;
  roleName: string;
  transport: ExecutorType;
  status: AgentStatus;
  teamId: string | null;
  teamName: string | null;
}

export interface TaskDetail extends TaskBoardItem {
  sourceTemplateName: string | null;
  parentTask: { id: string; title: string } | null;
  subtasks: TaskBoardItem[];
  relations: TaskRelationSummary[];
  createdAt: string;
  updatedAt: string;
  runs: RunListItem[];
  thread: ConversationThread;
  recentAssignment: TaskAssignment | null;
  availableAgents: AssignableAgentOption[];
  teamGuidance: string | null;
}

export interface IssueListItem extends TaskBoardItem {
  issueKey: string;
  projectName: string;
  projectCode: string;
  teamId: string | null;
  teamName: string | null;
  assigneeName: string | null;
  statusGroup: "triage" | "active" | "backlog" | "todo" | "done";
}

export interface IssueListResult {
  issues: IssueListItem[];
  views: SavedViewSummary[];
}

export interface TaskRelationSummary {
  id: string;
  relationType: TaskRelationType;
  direction: "outgoing" | "incoming";
  sourceTaskId: string;
  sourceTaskTitle: string;
  targetTaskId: string;
  targetTaskTitle: string;
  createdAt: string;
}

export interface ArtifactListItem {
  id: string;
  title: string;
  artifactType: string;
  storageUri: string;
  objectStorageBucket: string | null;
  objectKey: string | null;
  contentSha256: string | null;
  mimeType: string;
  sha256Digest: string;
  createdAt: string;
  includedInCertificate: boolean;
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
  sequenceNo: number | null;
  payloadDigest: string | null;
  prevEventHash: string | null;
  eventHash: string | null;
}

export interface ChainAnchorSummary {
  id: string;
  projectId: string;
  sequenceNo: number;
  chainHeadHash: string;
  anchorType: string;
  externalRef: string | null;
  proofPayload: string | null;
  verificationStatus: string | null;
  anchorCoverageStatus: "internal-only" | "partially-anchored" | "fully-anchored" | "failed";
  createdAt: string;
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
  executorType: ExecutorType;
  capabilityCode: string | null;
  status: RunStatus;
  traceId: string;
  inputPayload: string | null;
  outputSummary: string | null;
  errorMessage: string | null;
  agentSignature: string | null;
  nonce: string | null;
  signedAt: string | null;
  nonceLedger: NonceLedgerEvidence;
  startedAt: string | null;
  finishedAt: string | null;
  artifacts: ArtifactListItem[];
  approval: ApprovalRecord | null;
  chainHeadHash: string | null;
}

export interface NonceLedgerEvidence {
  found: boolean;
  nonce: string | null;
  agentId: string | null;
  usedAt: string | null;
  nonceFirstSeenAt: string | null;
  replayDetected: boolean;
}

export interface AgentSummary {
  id: string;
  name: string;
  roleName: string;
  transport: ExecutorType;
  capabilities: string[];
  status: AgentStatus;
  operatingState: AgentOperatingState;
  healthStatus: string;
  description: string;
  lastSeenAt: string | null;
  taskCount: number;
  runCount: number;
  activeRunCount: number;
  waitingReviewCount: number;
  successRate: number | null;
  estimatedCostCents: number | null;
  boundTeams: AgentTeamItem[];
}

export interface AgentTeamItem {
  id: string;
  name: string;
  slug: string;
}

export interface AgentDetail extends AgentSummary {
  tags: string[];
  recentRuns: RunListItem[];
  recentSessions: AgentInstruction[];
  ownedTasks: TaskBoardItem[];
  queuedAssignments: TaskAssignment[];
  recentMentions: ConversationMessage[];
  recentReplies: ConversationMessage[];
  capabilityAuthorizations: AgentCapabilityAuthorizationSummary[];
  signingKey: AgentSigningKeySummary | null;
}

export interface AgentCapabilityAuthorizationSummary {
  id: string;
  capabilityCode: string;
  scopeJson: string | null;
  issuedByMemberId: string;
  issuedByMemberName: string | null;
  validFrom: string;
  validUntil: string | null;
  keyVersion: string;
  signaturePrefix: string;
  nonce: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface AgentSigningKeySummary {
  keyVersion: string;
  publicKeyHex: string;
  algorithm: string;
  createdAt: string;
}

export interface SavedViewSummary {
  id: string;
  name: string;
  scope: SavedViewScope;
  teamId: string | null;
  projectId: string | null;
  filters: Record<string, unknown>;
  sort: Record<string, unknown> | null;
  displayColumns: string[];
  updatedAt: string;
}

export interface WorkflowTemplateListItem {
  id: string;
  teamId: string | null;
  teamName: string | null;
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

export interface ProjectUpdateItem {
  id: string;
  health: string;
  body: string;
  authorName: string | null;
  createdAt: string;
}

export interface ProjectResourceItem {
  id: string;
  title: string;
  url: string | null;
  resourceType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ProjectMilestoneItem {
  id: string;
  title: string;
  status: string;
  targetAt: string | null;
  completedAt: string | null;
}

export interface ProjectOverviewDetail extends ProjectDetail {
  updates: ProjectUpdateItem[];
  resources: ProjectResourceItem[];
  milestones: ProjectMilestoneItem[];
}

export interface EvidenceEventItem {
  id: string;
  sequenceNo: number | null;
  eventType: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId: string;
  traceId: string;
  payloadDigest: string | null;
  prevEventHash: string | null;
  eventHash: string | null;
  occurredAt: string;
}

export interface EvidenceRunItem {
  id: string;
  taskId: string;
  taskTitle: string;
  agentId: string;
  agentName: string;
  status: RunStatus;
  traceId: string;
  agentSignature: string | null;
  nonce: string | null;
  signedAt: string | null;
  nonceLedgerFound: boolean;
}

export interface EvidenceCertificateItem {
  id: string;
  certificateNo: string;
  status: CertificateStatus;
  digestSha256: string;
  signature: string;
  chainHeadHash: string;
  verificationUrl: string;
  issuedAt: string;
}

export interface EvidenceSummary {
  entityType: EvidenceEntityType;
  entityId: string;
  trustState: EvidenceTrustState;
  events: EvidenceEventItem[];
  runs: EvidenceRunItem[];
  certificates: EvidenceCertificateItem[];
}

export interface IntegrationConfigView {
  workspaceId: string;
  defaultExecutorType: ExecutorType;
  objectStorageProvider: ObjectStorageProvider;
  notificationChannel: NotificationChannel;
  approvalMode: ApprovalMode;
  openapiBaseUrl: string | null;
  mcpRelayBaseUrl: string | null;
  callbackBaseUrl: string | null;
  openapiHealthStatus: string;
  mcpRelayHealthStatus: string;
  lastHealthCheckedAt: string | null;
  updatedAt: string;
}

export interface WebhookSummary {
  id: string;
  workspaceId: string;
  url: string;
  events: string[];
  isActive: boolean;
  secretMasked: string;
  createdByName: string;
  deliveryCount: number;
  lastDeliveryStatus: string | null;
  lastDeliveryAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDetail extends WebhookSummary {
  deliveries: WebhookDeliverySummary[];
}

export interface WebhookDeliverySummary {
  id: string;
  webhookId: string;
  sourceEventId: string | null;
  eventType: string;
  status: string;
  attemptCount: number;
  nextAttemptAt: string;
  responseStatus: number | null;
  lastError: string | null;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
}

export interface WebhookTestResult {
  webhook: WebhookSummary;
  delivery: WebhookDeliverySummary;
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
  description?: string | null;
  teamId: string;
  health?: string;
  priority?: string;
}

export interface CreateTeamInput {
  name: string;
  description?: string | null;
  agentIds: string[];
  triageEnabled?: boolean;
  issueStatuses?: string[];
  agentGuidance?: string | null;
}

export interface UpdateTeamInput {
  name: string;
  description?: string | null;
  agentIds: string[];
  triageEnabled?: boolean;
  issueStatuses?: string[];
  agentGuidance?: string | null;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  priority?: TaskPriority;
  parentId?: string | null;
}

export interface UpdateTaskParentInput {
  parentId: string | null;
}

export interface CreateTaskRelationInput {
  targetTaskId: string;
  relationType: TaskRelationType;
}

export interface ProjectSettingsInput {
  name: string;
  customerName: string;
  description?: string | null;
  teamId: string;
  health?: string;
  priority?: string;
  targetDeliveryAt?: string | null;
  status?: ProjectStatus;
}

export interface TaskAssignmentInput {
  agentId: string;
  note?: string;
}

export interface TaskMessageInput {
  body: string;
  mentionAgentIds?: string[];
}

export interface MessageReplyInput {
  body: string;
  mentionAgentIds?: string[];
}

export interface ThreadResolveInput {
  resolved: boolean;
}

export interface ApprovalDecisionInput {
  comment?: string;
  clientRequestId?: string;
}

export interface UpdateIntegrationConfigInput {
  defaultExecutorType: ExecutorType;
  objectStorageProvider: ObjectStorageProvider;
  notificationChannel: NotificationChannel;
  callbackBaseUrl?: string | null;
  openapiBaseUrl?: string | null;
  mcpRelayBaseUrl?: string | null;
  approvalMode: ApprovalMode;
}

export interface CreateWebhookInput {
  url: string;
  events: string[];
  secret?: string;
}

export interface CreateAgentInput {
  name: string;
  roleName: string;
  description: string;
  transport: ExecutorType;
  capabilities: string[];
  tags?: string[];
}

export interface UpdateAgentInput {
  name?: string;
  roleName?: string;
  description?: string;
  status?: AgentStatus;
  transport?: ExecutorType;
  capabilities?: string[];
  tags?: string[];
}

export interface UpdateAgentTeamsInput {
  teamIds: string[];
}

export interface CreateIssueInput {
  projectId: string;
  title: string;
  description: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  delegateAgentId?: string | null;
  cycleId?: string | null;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  ownerMemberId?: string | null;
  delegateAgentId?: string | null;
  dueAt?: string | null;
  cycleId?: string | null;
  blockedReason?: string | null;
}

export interface IssueListQuery {
  scope?: "workspace" | "team" | "project" | "my";
  teamId?: string;
  projectId?: string;
  viewId?: string;
  status?: TaskStatus;
  statusGroup?: "triage" | "active" | "backlog" | "todo" | "done" | "all";
  priority?: TaskPriority;
  assigneeId?: string;
  delegateAgentId?: string;
  cycleId?: string;
  q?: string;
}

export interface CycleInput {
  name: string;
  status?: CycleStatus;
  startsAt: string;
  endsAt: string;
}

export type UpdateCycleInput = Partial<CycleInput>;

export interface SavedViewInput {
  name: string;
  scope: SavedViewScope;
  teamId?: string | null;
  projectId?: string | null;
  filters: Record<string, unknown>;
  sort?: Record<string, unknown> | null;
  displayColumns?: string[] | null;
}

export type UpdateSavedViewInput = Partial<SavedViewInput>;

export interface WorkflowTemplateInput {
  name: string;
  scenarioType: string;
  version: string;
  triggerType: "manual" | "webhook" | "scheduled";
  status: WorkflowTemplateStatus;
  teamId?: string | null;
  nodes: WorkflowTemplateNode[];
}

export type UpdateWorkflowTemplateInput = Partial<WorkflowTemplateInput>;

export interface AgentHeartbeatInput {
  healthStatus: string;
}

export interface CertificateAcceptInput {
  comment?: string;
  actorName?: string;
}

export interface InboxItem {
  id: string;
  kind: InboxItemKind;
  title: string;
  subtitle: string;
  body?: string | null;
  href: string;
  createdAt: string;
  status: string | null;
  unread: boolean;
  archived: boolean;
}

export interface CommandSearchItem {
  id: string;
  type: "issue" | "project" | "agent" | "team" | "workflow" | "view" | "evidence" | "action";
  title: string;
  subtitle: string;
  href: string;
  action: "navigate" | "create_issue" | "open_evidence";
  keywords: string[];
}

export interface CommandSearchResult {
  query: string;
  items: CommandSearchItem[];
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
