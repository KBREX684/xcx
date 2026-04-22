"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bootstrapContext, getApiBaseUrl } from "@agent-control-plane/config";

const API_BASE_URL = getApiBaseUrl();

async function requestJson(path: string, method: "POST" | "PUT", body: unknown) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Action failed: ${path}`);
  }

  return response.json();
}

function resolveReturnPath(formData: FormData, fallbackPath: string) {
  const rawValue = formData.get("returnPath");

  if (typeof rawValue !== "string") {
    return fallbackPath;
  }

  return sanitizeReturnPath(rawValue, fallbackPath);
}

function sanitizeReturnPath(rawValue: string, fallbackPath: string) {
  const candidate = rawValue.trim();
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallbackPath;
  }

  try {
    const parsed = new URL(candidate, "http://localhost");
    if (parsed.origin !== "http://localhost") {
      return fallbackPath;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallbackPath;
  }
}

export async function createProjectAction(formData: FormData) {
  const payload = {
    name: String(formData.get("name") ?? ""),
    customerName: String(formData.get("customerName") ?? "")
  };

  const project = (await requestJson("/api/v1/projects", "POST", payload)) as { id: string };
  redirect(`/projects/${project.id}`);
}

export async function createTaskAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}`);

  await requestJson(`/api/v1/projects/${projectId}/tasks`, "POST", {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    priority: "medium"
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function triggerWorkflowAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}`);
  await requestJson(`/api/v1/projects/${projectId}/workflows/${bootstrapContext.workflowTemplateId}/trigger`, "POST", {});
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/runs`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function approveRunAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}`);

  await requestJson(`/api/v1/runs/${runId}/approve`, "POST", {
    approverMemberId: bootstrapContext.approverMemberId,
    comment: String(formData.get("comment") ?? "审批通过，进入完成态。")
  });

  revalidatePath("/approvals");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/runs/${runId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function rejectRunAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}`);

  await requestJson(`/api/v1/runs/${runId}/reject`, "POST", {
    approverMemberId: bootstrapContext.approverMemberId,
    comment: String(formData.get("comment") ?? "需要补充回归说明后再提交。")
  });

  revalidatePath("/approvals");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/runs/${runId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function updateProjectSettingsAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}/settings`);

  await requestJson(`/api/v1/projects/${projectId}`, "PUT", {
    name: String(formData.get("name") ?? ""),
    customerName: String(formData.get("customerName") ?? ""),
    targetDeliveryAt: String(formData.get("targetDeliveryAt") ?? ""),
    status: String(formData.get("status") ?? "active")
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function updateIntegrationConfigAction(formData: FormData) {
  const returnPath = resolveReturnPath(formData, "/settings/integrations");

  await requestJson("/api/v1/settings/integrations", "PUT", {
    defaultExecutorType: String(formData.get("defaultExecutorType") ?? "mock"),
    objectStorageProvider: String(formData.get("objectStorageProvider") ?? "local-file"),
    notificationChannel: String(formData.get("notificationChannel") ?? "none"),
    approvalMode: String(formData.get("approvalMode") ?? "manual"),
    agentEndpoint: String(formData.get("agentEndpoint") ?? ""),
    callbackBaseUrl: String(formData.get("callbackBaseUrl") ?? "")
  });

  revalidatePath("/settings/integrations");
  revalidatePath(returnPath);
  redirect(returnPath);
}
