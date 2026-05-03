import { bootstrapContext, getApiBaseUrl } from "@agent-control-plane/config";
import { redirect } from "next/navigation";
import { getSessionToken } from "./auth";
import {
  DEFAULT_WORKFLOW_TEMPLATE,
  type AgentDetail,
  type AgentSummary,
  type ApprovalCenterData,
  type ArtifactDetail,
  type ArtifactListItem,
  type CertificateDetail,
  type CertificateSummary,
  type CertificateVerificationResult,
  type CertificateProofBundle,
  type CommandSearchResult,
  type ConversationMessageDetail,
  type ConversationThread,
  type CycleSummary,
  type DashboardSummary,
  type EvidenceSummary,
  type EventTimelineItem,
  type InboxItem,
  type IntegrationConfigView,
  type IssueListQuery,
  type IssueListResult,
  type MessageReplyInput,
  type ProjectCockpit,
  type ProjectDetail,
  type ProjectSummary,
  type RunDetail,
  type TaskBoardItem,
  type TaskAssignmentInput,
  type TaskDetail,
  type TaskMessageInput,
  type TeamDetail,
  type TeamSummary,
  type ThreadResolveInput,
  type WebhookDeliverySummary,
  type WebhookDetail,
  type WebhookSummary,
  type WebhookTestResult,
  type WorkflowTemplateDetail,
  type WorkflowTemplateListItem,
} from "@agent-control-plane/domain";

const API_BASE_URL = getApiBaseUrl();

/**
 * 服务端数据获取统一入口。
 *
 * ⚠️ 401 处理调用了 `redirect()`，它通过抛出 `NEXT_REDIRECT` 错误打断渲染流程：
 * - 在 `Promise.all([request(...), request(...)])` 中并发调用时，其中一条 401
 *   只会让对应分支抛错，其他分支仍可能继续访问后端，并把已失效的会话写入日志/缓存。
 * - 为避免上述情况，建议在页面顶层先串行调用一次首要 `request`（例如鉴权探针或
 *   项目列表），命中 401 后立即 redirect；其余非关键数据再用 `Promise.all` 并发。
 * - 不要把 `request` 包进 `try/catch` 后吞掉错误：会拦截 redirect 信号，导致
 *   会话过期时停留在错误页。
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSessionToken();
  const method = (init?.method ?? "GET").toUpperCase();
  const isReadOnly = method === "GET" || method === "HEAD";

  // 读路径：进入 Next.js Data Cache，命中即零网络。
  // 使用基于 path 的 tag，server actions 通过 revalidatePath / revalidateTag 主动失效；
  // 短 revalidate 兜底，避免久未失效。
  // 写路径（POST/PATCH/PUT/DELETE）：仍 no-store，保持立即可见性。
  const cacheConfig: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = isReadOnly
    ? {
        next: {
          revalidate: 30,
          tags: [`api:${path.split("?")[0] ?? path}`],
        },
      }
    : { cache: "no-store" };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...cacheConfig,
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401) {
    redirect("/logout?reason=session_expired");
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Request failed: ${path} ${response.status} ${message}`);
  }

  return response.json() as Promise<T>;
}

export function getProjects() {
  return request<ProjectSummary[]>("/api/v1/projects");
}

function buildQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  const rendered = query.toString();
  return rendered ? `?${rendered}` : "";
}

export function getDashboardSummary() {
  return request<DashboardSummary>("/api/v1/dashboard");
}

export function getFilteredProjects(filters?: { status?: string; q?: string }) {
  return request<ProjectSummary[]>(`/api/v1/projects${buildQuery(filters ?? {})}`);
}

export function getProject(projectId: string) {
  return request<ProjectDetail>(`/api/v1/projects/${projectId}`);
}

export function getProjectTasks(projectId: string) {
  return request<TaskBoardItem[]>(`/api/v1/projects/${projectId}/tasks`);
}

export function getIssues(filters?: IssueListQuery) {
  return request<IssueListResult>(`/api/v1/issues${buildQuery(stringifyQuery(filters ?? {}))}`);
}

export function getCommandSearch(q?: string) {
  return request<CommandSearchResult>(`/api/v1/command/search${buildQuery({ q })}`);
}

export function getEvidence(entityType: EvidenceSummary["entityType"], entityId: string) {
  return request<EvidenceSummary>(`/api/v1/evidence/${entityType}/${entityId}`);
}

export function getTask(taskId: string) {
  return request<TaskDetail>(`/api/v1/tasks/${taskId}`);
}

export function getTaskThread(taskId: string) {
  return request<ConversationThread>(`/api/v1/tasks/${taskId}/thread`);
}

export function getMessage(messageId: string) {
  return request<ConversationMessageDetail>(`/api/v1/messages/${messageId}`);
}

export function getProjectArtifacts(projectId: string) {
  return request<ArtifactListItem[]>(`/api/v1/projects/${projectId}/artifacts`);
}

export function getProjectEvents(projectId: string) {
  return request<EventTimelineItem[]>(`/api/v1/projects/${projectId}/events`);
}

export function getRun(runId: string) {
  return request<RunDetail>(`/api/v1/runs/${runId}`);
}

export function getApprovals() {
  return request<ApprovalCenterData>("/api/v1/approvals");
}

export function getInbox(
  input?:
    | { lastSeenAt?: string | null; kind?: string; unread?: boolean; archived?: boolean }
    | string
    | null,
) {
  const filters =
    typeof input === "string" || input === null || input === undefined
      ? { lastSeenAt: input }
      : input;
  return request<InboxItem[]>(
    `/api/v1/inbox${buildQuery({
      lastSeenAt: filters.lastSeenAt ?? undefined,
      kind: filters.kind,
      unread: filters.unread === undefined ? undefined : String(filters.unread),
      archived: filters.archived === undefined ? undefined : String(filters.archived),
    })}`,
  );
}

export function getTeams() {
  return request<TeamSummary[]>("/api/v1/teams");
}

export function getTeam(teamId: string) {
  return request<TeamDetail>(`/api/v1/teams/${teamId}`);
}

export function getTeamCycles(teamId: string) {
  return request<CycleSummary[]>(`/api/v1/teams/${teamId}/cycles`);
}

export function getArtifact(artifactId: string) {
  return request<ArtifactDetail>(`/api/v1/artifacts/${artifactId}`);
}

export function getAgents() {
  return request<AgentSummary[]>("/api/v1/agents");
}

export function getAgent(agentId: string) {
  return request<AgentDetail>(`/api/v1/agents/${agentId}`);
}

export function getWorkflowTemplates() {
  return request<WorkflowTemplateListItem[]>("/api/v1/workflows");
}

export function getWorkflowTemplate(templateId: string) {
  return request<WorkflowTemplateDetail>(`/api/v1/workflows/${templateId}`);
}

export function getCertificates() {
  return request<CertificateSummary[]>("/api/v1/certificates");
}

export function getCertificate(certificateId: string) {
  return request<CertificateDetail>(`/api/v1/certificates/${certificateId}`);
}

export function verifyCertificate(verificationCode: string) {
  return request<CertificateVerificationResult>(`/api/v1/certificates/verify/${verificationCode}`);
}

export function getCertificateProof(verificationCode: string) {
  return request<CertificateProofBundle>(`/api/v1/certificates/verify/${verificationCode}/proof`);
}

export function getProjectCertificates(projectId: string) {
  return request<CertificateSummary[]>(`/api/v1/projects/${projectId}/certificates`);
}

export function getIntegrationConfig() {
  return request<IntegrationConfigView>("/api/v1/settings/integrations");
}

export function getWebhooks() {
  return request<WebhookSummary[]>("/api/v1/webhooks");
}

export function getWebhook(webhookId: string) {
  return request<WebhookDetail>(`/api/v1/webhooks/${webhookId}`);
}

export function getWebhookDeliveries(webhookId: string) {
  return request<WebhookDeliverySummary[]>(`/api/v1/webhooks/${webhookId}/deliveries`);
}

export function testWebhook(webhookId: string) {
  return request<WebhookTestResult>(`/api/v1/webhooks/${webhookId}/test`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function assignTask(taskId: string, payload: TaskAssignmentInput) {
  return request<TaskDetail>(`/api/v1/tasks/${taskId}/assign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function postTaskMessage(taskId: string, payload: TaskMessageInput) {
  return request<ConversationThread>(`/api/v1/tasks/${taskId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function replyMessage(messageId: string, payload: MessageReplyInput) {
  return request<ConversationThread>(`/api/v1/messages/${messageId}/reply`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resolveMessageThread(messageId: string, payload: ThreadResolveInput) {
  return request<ConversationThread>(`/api/v1/messages/${messageId}/resolve`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function stringifyQuery(params: object) {
  return Object.fromEntries(
    Object.entries(params as Record<string, unknown>)
      .filter(([, value]) => typeof value === "string" && value.length > 0)
      .map(([key, value]) => [key, String(value)]),
  );
}

export async function getProjectCockpit(projectId: string): Promise<ProjectCockpit | null> {
  const [project, tasks, artifacts, events] = await Promise.all([
    getProject(projectId),
    getProjectTasks(projectId),
    getProjectArtifacts(projectId),
    getProjectEvents(projectId),
  ]);

  const pendingTask = tasks.find(
    (task) => task.currentRunStatus === "waiting_approval" && task.currentRunId,
  );
  const latestTask = tasks.find((task) => task.currentRunId);
  const runId = pendingTask?.currentRunId ?? latestTask?.currentRunId ?? null;
  const currentRun = runId ? await getRun(runId) : null;
  const templates = await getWorkflowTemplates().catch(() => []);
  const activeTemplates = templates.filter((template) => template.status === "active");
  const selectedTemplate =
    activeTemplates.find((template) => template.teamId === project.teamId) ??
    activeTemplates.find((template) => !template.teamId) ??
    templates[0] ??
    null;

  return {
    project,
    template: selectedTemplate
      ? {
          id: selectedTemplate.id,
          name: selectedTemplate.name,
          scenarioType: selectedTemplate.scenarioType,
          version: selectedTemplate.version,
        }
      : {
          id: bootstrapContext.workflowTemplateId,
          name: DEFAULT_WORKFLOW_TEMPLATE.name,
          scenarioType: DEFAULT_WORKFLOW_TEMPLATE.scenarioType,
          version: DEFAULT_WORKFLOW_TEMPLATE.version,
        },
    tasks,
    currentRun,
    artifacts,
    events,
  };
}
