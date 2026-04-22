"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bootstrapContext, getApiBaseUrl } from "@agent-control-plane/config";

const API_BASE_URL = getApiBaseUrl();

async function post(path: string, body: unknown) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
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

export async function createProjectAction(formData: FormData) {
  const payload = {
    name: String(formData.get("name") ?? ""),
    customerName: String(formData.get("customerName") ?? "")
  };

  const project = (await post("/api/v1/projects", payload)) as { id: string };
  redirect(`/projects/${project.id}`);
}

export async function createTaskAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  await post(`/api/v1/projects/${projectId}/tasks`, {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    priority: "medium"
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function triggerWorkflowAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  await post(`/api/v1/projects/${projectId}/workflows/${bootstrapContext.workflowTemplateId}/trigger`, {});
  revalidatePath(`/projects/${projectId}`);
}

export async function approveRunAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const runId = String(formData.get("runId") ?? "");

  await post(`/api/v1/runs/${runId}/approve`, {
    approverMemberId: bootstrapContext.approverMemberId,
    comment: String(formData.get("comment") ?? "审批通过，进入完成态。")
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function rejectRunAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const runId = String(formData.get("runId") ?? "");

  await post(`/api/v1/runs/${runId}/reject`, {
    approverMemberId: bootstrapContext.approverMemberId,
    comment: String(formData.get("comment") ?? "需要补充回归说明后再提交。")
  });

  revalidatePath(`/projects/${projectId}`);
}

