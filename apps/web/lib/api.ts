import { bootstrapContext, getApiBaseUrl } from "@agent-control-plane/config";
import { DEFAULT_WORKFLOW_TEMPLATE, type ArtifactListItem, type EventTimelineItem, type ProjectCockpit, type ProjectSummary, type RunDetail, type TaskBoardItem } from "@agent-control-plane/domain";

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

export function getProjectTasks(projectId: string) {
  return request<TaskBoardItem[]>(`/api/v1/projects/${projectId}/tasks`);
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

export async function getProjectCockpit(projectId: string): Promise<ProjectCockpit | null> {
  const [projects, tasks, artifacts, events] = await Promise.all([
    getProjects(),
    getProjectTasks(projectId),
    getProjectArtifacts(projectId),
    getProjectEvents(projectId)
  ]);

  const project = projects.find((item) => item.id === projectId);
  if (!project) {
    return null;
  }

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

