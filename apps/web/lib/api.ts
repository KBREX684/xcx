import { bootstrapContext, getApiBaseUrl } from "@agent-control-plane/config";
import {
  DEFAULT_WORKFLOW_TEMPLATE,
  type AgentDetail,
  type AgentSummary,
  type ApprovalCenterData,
  type ArtifactDetail,
  type ArtifactListItem,
  type CertificateSummary,
  type DashboardSummary,
  type EventTimelineItem,
  type IntegrationConfigView,
  type ProjectCockpit,
  type ProjectDetail,
  type ProjectSummary,
  type RunDetail,
  type TaskBoardItem,
  type TaskDetail,
  type WorkflowTemplateDetail,
  type WorkflowTemplateListItem
} from "@agent-control-plane/domain";

const API_BASE_URL = getApiBaseUrl();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

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

export function getTask(taskId: string) {
  return request<TaskDetail>(`/api/v1/tasks/${taskId}`);
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

export function getIntegrationConfig() {
  return request<IntegrationConfigView>("/api/v1/settings/integrations");
}

export async function getProjectCockpit(projectId: string): Promise<ProjectCockpit | null> {
  const [project, tasks, artifacts, events] = await Promise.all([
    getProject(projectId),
    getProjectTasks(projectId),
    getProjectArtifacts(projectId),
    getProjectEvents(projectId)
  ]);

  const pendingTask = tasks.find((task) => task.currentRunStatus === "waiting_approval" && task.currentRunId);
  const latestTask = tasks.find((task) => task.currentRunId);
  const runId = pendingTask?.currentRunId ?? latestTask?.currentRunId ?? null;
  const currentRun = runId ? await getRun(runId) : null;

  return {
    project,
    template: {
      id: bootstrapContext.workflowTemplateId,
      name: DEFAULT_WORKFLOW_TEMPLATE.name,
      scenarioType: DEFAULT_WORKFLOW_TEMPLATE.scenarioType,
      version: DEFAULT_WORKFLOW_TEMPLATE.version
    },
    tasks,
    currentRun,
    artifacts,
    events
  };
}
