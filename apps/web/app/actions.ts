"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { bootstrapContext, getApiBaseUrl } from "@agent-control-plane/config";
import { actionError, actionOk, type ActionResult } from "../lib/action-result";
import { clearSessionCookies, getSessionToken } from "../lib/auth";
import { toFriendlyError } from "../lib/error-messages";

const API_BASE_URL = getApiBaseUrl();

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as {
      message?: unknown;
      error?: unknown;
      errors?: unknown;
    } | null;
    const validationMessage = readValidationMessage(payload?.errors);
    if (validationMessage) return validationMessage;
    if (typeof payload?.message === "string") return payload.message;
    if (Array.isArray(payload?.message)) return payload.message.join("; ");
    if (typeof payload?.error === "string") return payload.error;
  }

  const text = await response.text().catch(() => "");
  return text || fallback;
}

function readValidationMessage(errors: unknown): string | null {
  if (!errors || typeof errors !== "object") {
    return null;
  }

  for (const value of Object.values(errors as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      const first = value.find((item) => typeof item === "string" && item.trim().length > 0);
      if (first) return first;
    }
  }

  return null;
}

async function requestJson<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body: unknown,
): Promise<ActionResult<T>> {
  const token = await getSessionToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (response.status === 401) {
    await clearSessionCookies();
    redirect("/login?reason=session_expired");
  }

  if (!response.ok) {
    return actionError(toFriendlyError(await readErrorMessage(response, `Action failed: ${path}`)));
  }

  return actionOk<T>((await response.json().catch(() => undefined)) as T);
}

async function requestJsonOrThrow<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body: unknown,
): Promise<T> {
  const result = await requestJson<T>(path, method, body);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.data as T;
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

function readMultiValue(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function readCsv(formData: FormData, key: string) {
  return String(formData.get(key) ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function revalidateApiPath(path: string) {
  revalidateTag(`api:${path}`, "max");
}

function toIsoDateTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
}

export async function createProjectAction(formData: FormData) {
  const payload = {
    name: String(formData.get("name") ?? ""),
    customerName: String(formData.get("customerName") ?? ""),
    description: String(formData.get("description") ?? ""),
    teamId: String(formData.get("teamId") ?? ""),
    health: String(formData.get("health") ?? "on_track"),
    priority: String(formData.get("priority") ?? "medium"),
  };

  const project = await requestJsonOrThrow<{ id: string }>("/api/v1/projects", "POST", payload);
  revalidateApiPath("/api/v1/projects");
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function createTeamAction(formData: FormData) {
  const payload = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    agentIds: readMultiValue(formData, "agentIds"),
    triageEnabled: formData.has("triageEnabled")
      ? formData.getAll("triageEnabled").map(String).includes("true")
      : true,
    issueStatuses: readCsv(formData, "issueStatuses"),
    agentGuidance: String(formData.get("agentGuidance") ?? ""),
  };

  const team = await requestJsonOrThrow<{ id: string }>("/api/v1/teams", "POST", payload);
  revalidateApiPath("/api/v1/teams");
  revalidatePath("/team");
  revalidatePath("/projects");
  revalidatePath("/workflows");
  redirect(`/team/${team.id}`);
}

export async function updateTeamAction(formData: FormData) {
  const teamId = String(formData.get("teamId") ?? "");
  const returnPath = resolveReturnPath(formData, `/team/${teamId}`);

  await requestJsonOrThrow(`/api/v1/teams/${teamId}`, "PUT", {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    agentIds: readMultiValue(formData, "agentIds"),
    triageEnabled: formData.getAll("triageEnabled").map(String).includes("true"),
    issueStatuses: readCsv(formData, "issueStatuses"),
    agentGuidance: String(formData.get("agentGuidance") ?? ""),
  });

  revalidatePath("/team");
  revalidatePath(`/team/${teamId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function createCycleAction(formData: FormData) {
  const teamId = String(formData.get("teamId") ?? "");
  const returnPath = resolveReturnPath(formData, `/team/${teamId}`);

  await requestJsonOrThrow(`/api/v1/teams/${teamId}/cycles`, "POST", {
    name: String(formData.get("name") ?? ""),
    status: String(formData.get("status") ?? "planned"),
    startsAt: toIsoDateTime(String(formData.get("startsAt") ?? "")),
    endsAt: toIsoDateTime(String(formData.get("endsAt") ?? "")),
  });

  revalidatePath(`/team/${teamId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function updateCycleAction(formData: FormData) {
  const teamId = String(formData.get("teamId") ?? "");
  const cycleId = String(formData.get("cycleId") ?? "");
  const returnPath = resolveReturnPath(formData, `/team/${teamId}`);

  await requestJsonOrThrow(`/api/v1/teams/${teamId}/cycles/${cycleId}`, "PATCH", {
    name: String(formData.get("name") ?? "") || undefined,
    status: String(formData.get("status") ?? "") || undefined,
    startsAt: toIsoDateTime(String(formData.get("startsAt") ?? "")) || undefined,
    endsAt: toIsoDateTime(String(formData.get("endsAt") ?? "")) || undefined,
  });

  revalidatePath(`/team/${teamId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function createTaskAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}`);

  await requestJsonOrThrow(`/api/v1/projects/${projectId}/tasks`, "POST", {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    priority: "medium",
    parentId: String(formData.get("parentId") ?? "") || null,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function createIssueAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const returnPath = resolveReturnPath(formData, "/issues");

  await requestJsonOrThrow("/api/v1/issues", "POST", {
    projectId,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    priority: String(formData.get("priority") ?? "medium"),
    status: String(formData.get("status") ?? "backlog"),
    delegateAgentId: String(formData.get("delegateAgentId") ?? ""),
  });

  revalidatePath("/issues");
  revalidatePath("/my-issues");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function updateIssueAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}/tasks/${taskId}`);

  await requestJsonOrThrow(`/api/v1/issues/${taskId}`, "PATCH", {
    title: String(formData.get("title") ?? "") || undefined,
    description: String(formData.get("description") ?? "") || undefined,
    status: String(formData.get("status") ?? "") || undefined,
    priority: String(formData.get("priority") ?? "") || undefined,
    ownerMemberId: String(formData.get("ownerMemberId") ?? "") || undefined,
    delegateAgentId: String(formData.get("delegateAgentId") ?? ""),
    dueAt: String(formData.get("dueAt") ?? "") || null,
    cycleId: String(formData.get("cycleId") ?? "") || null,
    blockedReason: String(formData.get("blockedReason") ?? "") || null,
  });

  revalidatePath("/issues");
  revalidatePath("/my-issues");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function createTaskRelationAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}/tasks/${taskId}`);

  await requestJsonOrThrow(`/api/v1/tasks/${taskId}/relations`, "POST", {
    targetTaskId: String(formData.get("targetTaskId") ?? ""),
    relationType: String(formData.get("relationType") ?? "relates"),
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function deleteTaskRelationAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const relationId = String(formData.get("relationId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}/tasks/${taskId}`);

  await requestJsonOrThrow(`/api/v1/tasks/${taskId}/relations/${relationId}`, "DELETE", {});

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function assignTaskAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}/tasks/${taskId}`);

  const result = await requestJson(`/api/v1/tasks/${taskId}/assign`, "POST", {
    agentId: String(formData.get("agentId") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  if (!result.ok) return result;

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
  revalidatePath("/messages");
  revalidatePath("/agents");
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function postTaskMessageAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}/tasks/${taskId}`);

  const result = await requestJson(`/api/v1/tasks/${taskId}/messages`, "POST", {
    body: String(formData.get("body") ?? ""),
    mentionAgentIds: readMultiValue(formData, "mentionAgentIds"),
  });
  if (!result.ok) return result;

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
  revalidatePath("/messages");
  revalidatePath("/agents");
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function replyMessageAction(formData: FormData) {
  const messageId = String(formData.get("messageId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}/tasks/${taskId}`);

  const result = await requestJson(`/api/v1/messages/${messageId}/reply`, "POST", {
    body: String(formData.get("body") ?? ""),
    mentionAgentIds: readMultiValue(formData, "mentionAgentIds"),
  });
  if (!result.ok) return result;

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
  revalidatePath("/messages");
  revalidatePath("/agents");
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function resolveThreadAction(formData: FormData) {
  const messageId = String(formData.get("messageId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}/tasks/${taskId}`);
  const resolved = String(formData.get("resolved") ?? "true") !== "false";

  const result = await requestJson(`/api/v1/messages/${messageId}/resolve`, "POST", {
    resolved,
  });
  if (!result.ok) return result;

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
  revalidatePath("/messages");
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function markInboxReadAction(formData: FormData) {
  const returnPath = resolveReturnPath(formData, "/messages");
  const itemIds = readMultiValue(formData, "itemIds");
  const result = await requestJson("/api/v1/inbox/read", "POST", { itemIds });
  if (!result.ok) return result;

  revalidateApiPath("/api/v1/inbox");
  revalidatePath("/messages");
  revalidatePath(returnPath);
  return actionOk();
}

export async function archiveInboxAction(formData: FormData) {
  const returnPath = resolveReturnPath(formData, "/messages");
  const itemIds = readMultiValue(formData, "itemIds");
  const result = await requestJson("/api/v1/inbox/archive", "POST", { itemIds });
  if (!result.ok) return result;

  revalidateApiPath("/api/v1/inbox");
  revalidatePath("/messages");
  revalidatePath(returnPath);
  return actionOk();
}

export async function editMessageAction(formData: FormData): Promise<ActionResult | void> {
  const messageId = String(formData.get("messageId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}/tasks/${taskId}`);
  const body = String(formData.get("body") ?? "").trim();

  if (!messageId) return actionError("缺少消息 ID。");
  if (!body) return actionError("评论内容不能为空。");
  if (body.length > 2000) return actionError("评论内容不能超过 2000 个字。");

  const result = await requestJson(`/api/v1/messages/${messageId}/edit`, "POST", { body });
  if (!result.ok) return result;

  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
  revalidatePath("/messages");
  revalidatePath(returnPath);
}

export async function triggerWorkflowAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const templateId =
    String(formData.get("templateId") ?? "").trim() || bootstrapContext.workflowTemplateId;
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}`);

  await requestJsonOrThrow(
    `/api/v1/projects/${projectId}/workflows/${templateId}/trigger`,
    "POST",
    {},
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/runs");
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function approveRunAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}`);

  const result = await requestJson(`/api/v1/runs/${runId}/approve`, "POST", {
    comment: String(formData.get("comment") ?? "审批通过，进入签发与交付阶段。"),
  });
  if (!result.ok) return result;

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

  const result = await requestJson(`/api/v1/runs/${runId}/reject`, "POST", {
    comment: String(formData.get("comment") ?? "需要补充说明后再次提交。"),
  });
  if (!result.ok) return result;

  revalidatePath("/approvals");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/runs/${runId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function cancelRunAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const returnPath = resolveReturnPath(formData, `/runs/${runId}`);

  const result = await requestJson(`/api/v1/runs/${runId}/cancel`, "POST", {});
  if (!result.ok) {
    throw new Error(result.error);
  }

  revalidatePath("/approvals");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/runs/${runId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function rerunAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const runId = String(formData.get("runId") ?? "");

  const result = await requestJson<{ id: string }>(`/api/v1/runs/${runId}/rerun`, "POST", {});
  if (!result.ok) {
    throw new Error(result.error);
  }
  const newRunId = result.data?.id;
  if (!newRunId) {
    throw new Error("Rerun did not return a new run id.");
  }

  revalidatePath("/approvals");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/runs/${runId}`);
  revalidatePath(`/runs/${newRunId}`);
  redirect(`/runs/${newRunId}`);
}

export async function bulkApprovalAction(input: {
  runIds: string[];
  decision: "approve" | "reject";
  comment?: string;
}): Promise<
  ActionResult<{ succeeded: string[]; failed: Array<{ runId: string; error: string }> }>
> {
  if (!Array.isArray(input.runIds) || input.runIds.length === 0) {
    return actionError("请至少选择一条待审批记录。");
  }
  if (input.runIds.length > 50) {
    return actionError("一次最多批量处理 50 条。");
  }

  const endpoint = input.decision === "approve" ? "approve" : "reject";
  const fallbackComment =
    input.decision === "approve"
      ? "批量通过：进入签发与交付阶段。"
      : "批量驳回：需要补充说明后再次提交。";

  const succeeded: string[] = [];
  const failed: Array<{ runId: string; error: string }> = [];

  for (const runId of input.runIds) {
    const result = await requestJson(`/api/v1/runs/${runId}/${endpoint}`, "POST", {
      comment: input.comment?.trim() || fallbackComment,
    });
    if (result.ok) {
      succeeded.push(runId);
    } else {
      failed.push({ runId, error: result.error });
    }
  }

  revalidatePath("/approvals");
  revalidatePath("/messages");

  if (failed.length > 0 && succeeded.length === 0) {
    const firstFailure = failed[0];
    return actionError(
      `全部 ${failed.length} 条处理失败：${firstFailure?.error ?? "unknown error"}`,
    );
  }

  return actionOk({ succeeded, failed });
}

export async function updateProjectSettingsAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}/settings`);

  await requestJsonOrThrow(`/api/v1/projects/${projectId}`, "PUT", {
    name: String(formData.get("name") ?? ""),
    customerName: String(formData.get("customerName") ?? ""),
    description: String(formData.get("description") ?? ""),
    teamId: String(formData.get("teamId") ?? ""),
    targetDeliveryAt: String(formData.get("targetDeliveryAt") ?? ""),
    status: String(formData.get("status") ?? "active"),
    health: String(formData.get("health") ?? "on_track"),
    priority: String(formData.get("priority") ?? "medium"),
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function updateIntegrationConfigAction(formData: FormData) {
  const returnPath = resolveReturnPath(formData, "/settings/integrations");

  await requestJsonOrThrow("/api/v1/settings/integrations", "PUT", {
    defaultExecutorType: String(formData.get("defaultExecutorType") ?? "openapi"),
    objectStorageProvider: String(formData.get("objectStorageProvider") ?? "local-file"),
    notificationChannel: String(formData.get("notificationChannel") ?? "none"),
    approvalMode: String(formData.get("approvalMode") ?? "manual"),
    openapiBaseUrl: String(formData.get("openapiBaseUrl") ?? ""),
    mcpRelayBaseUrl: String(formData.get("mcpRelayBaseUrl") ?? ""),
    callbackBaseUrl: String(formData.get("callbackBaseUrl") ?? ""),
  });

  revalidatePath("/settings/integrations");
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function createAgentAction(formData: FormData) {
  const agent = await requestJsonOrThrow<{ id: string }>("/api/v1/agents", "POST", {
    name: String(formData.get("name") ?? ""),
    roleName: String(formData.get("roleName") ?? ""),
    description: String(formData.get("description") ?? ""),
    transport: String(formData.get("transport") ?? "openapi"),
    capabilities: readCsv(formData, "capabilities"),
    tags: readCsv(formData, "tags"),
  });

  revalidatePath("/agents");
  redirect(`/agents/${agent.id}`);
}

export async function updateAgentAction(formData: FormData) {
  const agentId = String(formData.get("agentId") ?? "");
  const returnPath = resolveReturnPath(formData, `/agents/${agentId}`);

  await requestJsonOrThrow(`/api/v1/agents/${agentId}`, "PATCH", {
    name: String(formData.get("name") ?? ""),
    roleName: String(formData.get("roleName") ?? ""),
    description: String(formData.get("description") ?? ""),
    status: String(formData.get("status") ?? "active"),
    transport: String(formData.get("transport") ?? "openapi"),
    capabilities: readCsv(formData, "capabilities"),
    tags: readCsv(formData, "tags"),
  });

  await requestJsonOrThrow(`/api/v1/agents/${agentId}/teams`, "PATCH", {
    teamIds: readMultiValue(formData, "teamIds"),
  });

  revalidatePath("/agents");
  revalidatePath(`/agents/${agentId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function grantAgentCapabilityAction(formData: FormData) {
  const agentId = String(formData.get("agentId") ?? "");
  const returnPath = resolveReturnPath(formData, `/agents/${agentId}`);
  const capabilityCode = String(formData.get("capabilityCode") ?? "").trim();
  const validUntilRaw = String(formData.get("validUntil") ?? "").trim();
  const scopeRaw = String(formData.get("scopeJson") ?? "").trim();

  let scopeJson: Record<string, unknown> | undefined;
  if (scopeRaw) {
    try {
      const parsed = JSON.parse(scopeRaw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        scopeJson = parsed as Record<string, unknown>;
      } else {
        return actionError("scope 必须是 JSON 对象。");
      }
    } catch {
      return actionError("scope 不是合法 JSON。");
    }
  }

  let validUntil: string | undefined;
  if (validUntilRaw) {
    const date = new Date(validUntilRaw);
    if (Number.isNaN(date.getTime())) {
      return actionError("有效期不是合法时间。");
    }
    validUntil = date.toISOString();
  }

  const result = await requestJson(`/api/v1/agents/${agentId}/grant-capability`, "POST", {
    capabilityCode,
    scopeJson,
    validUntil,
  });
  if (!result.ok) return result;

  revalidatePath("/agents");
  revalidatePath(`/agents/${agentId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function revokeAgentCapabilityAction(formData: FormData) {
  const agentId = String(formData.get("agentId") ?? "");
  const authorizationId = String(formData.get("authorizationId") ?? "").trim() || undefined;
  const capabilityCode = String(formData.get("capabilityCode") ?? "").trim() || undefined;
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  const returnPath = resolveReturnPath(formData, `/agents/${agentId}`);

  if (!authorizationId && !capabilityCode) {
    return actionError("缺少 authorizationId 或 capabilityCode。");
  }

  const result = await requestJson(`/api/v1/agents/${agentId}/revoke-capability`, "POST", {
    authorizationId,
    capabilityCode,
    reason,
  });
  if (!result.ok) return result;

  revalidatePath(`/agents/${agentId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function rotateAgentKeyAction(formData: FormData) {
  const agentId = String(formData.get("agentId") ?? "");
  const publicKeyHex = String(formData.get("publicKeyHex") ?? "")
    .trim()
    .toLowerCase();
  const keyVersion = String(formData.get("keyVersion") ?? "").trim() || undefined;
  const returnPath = resolveReturnPath(formData, `/agents/${agentId}`);

  if (!/^[0-9a-f]{64}$/.test(publicKeyHex)) {
    return actionError("公钥必须是 64 字符的十六进制字符串。");
  }

  const result = await requestJson(`/api/v1/agents/${agentId}/rotate-key`, "POST", {
    publicKeyHex,
    keyVersion,
  });
  if (!result.ok) return result;

  revalidatePath(`/agents/${agentId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function createWorkflowTemplateAction(formData: FormData) {
  const workflow = await requestJsonOrThrow<{ id: string }>("/api/v1/workflows", "POST", {
    name: String(formData.get("name") ?? ""),
    scenarioType: String(formData.get("scenarioType") ?? "delivery"),
    version: String(formData.get("version") ?? "1.0.0"),
    triggerType: String(formData.get("triggerType") ?? "manual"),
    status: String(formData.get("status") ?? "active"),
    teamId: String(formData.get("teamId") ?? ""),
    nodes: parseWorkflowNodesForm(formData),
  });

  revalidatePath("/workflows");
  revalidatePath("/projects");
  revalidateApiPath("/api/v1/workflows");
  redirect(`/workflows/${workflow.id}`);
}

export async function updateWorkflowTemplateAction(formData: FormData) {
  const templateId = String(formData.get("templateId") ?? "");
  const returnPath = resolveReturnPath(formData, `/workflows/${templateId}`);

  await requestJsonOrThrow(`/api/v1/workflows/${templateId}`, "PATCH", {
    name: String(formData.get("name") ?? ""),
    scenarioType: String(formData.get("scenarioType") ?? "delivery"),
    version: String(formData.get("version") ?? "1.0.0"),
    triggerType: String(formData.get("triggerType") ?? "manual"),
    status: String(formData.get("status") ?? "active"),
    teamId: String(formData.get("teamId") ?? ""),
    nodes: parseWorkflowNodesForm(formData),
  });

  revalidatePath("/workflows");
  revalidatePath(`/workflows/${templateId}`);
  revalidatePath("/projects");
  revalidateApiPath("/api/v1/workflows");
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function createSavedViewAction(formData: FormData) {
  const filters = {
    status: String(formData.get("status") ?? ""),
    statusGroup: String(formData.get("statusGroup") ?? "all"),
    priority: String(formData.get("priority") ?? ""),
    teamId: String(formData.get("teamId") ?? ""),
    projectId: String(formData.get("projectId") ?? ""),
    cycleId: String(formData.get("cycleId") ?? ""),
    delegateAgentId: String(formData.get("delegateAgentId") ?? ""),
    q: String(formData.get("q") ?? ""),
    layout: String(formData.get("layout") ?? "list"),
  };

  const view = await requestJsonOrThrow<{ id: string }>("/api/v1/views", "POST", {
    name: String(formData.get("name") ?? ""),
    scope: String(formData.get("scope") ?? "workspace"),
    teamId: filters.teamId,
    projectId: filters.projectId,
    filters,
    sort: { updatedAt: "desc" },
    displayColumns: ["issue", "status", "project", "agent", "updated"],
  });

  revalidatePath("/issues");
  redirect(`/views/${view.id}`);
}

function parseWorkflowNodesForm(formData: FormData) {
  const raw = String(formData.get("nodes") ?? "").trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fall back to a compact default node below.
    }
  }

  return [
    {
      key: "intake",
      type: "task",
      name: "Intake",
      capabilityCode: "delivery-intake",
    },
    {
      key: "approval",
      type: "approval",
      name: "Human approval",
    },
  ];
}

export async function createWebhookAction(formData: FormData) {
  const returnPath = resolveReturnPath(formData, "/settings/integrations");
  const events = readCsv(formData, "events");

  await requestJsonOrThrow("/api/v1/webhooks", "POST", {
    url: String(formData.get("url") ?? ""),
    secret: String(formData.get("secret") ?? "") || undefined,
    events,
  });

  revalidatePath("/settings/integrations");
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function testWebhookAction(formData: FormData) {
  const webhookId = String(formData.get("webhookId") ?? "");
  const returnPath = resolveReturnPath(formData, "/settings/integrations");

  await requestJsonOrThrow(`/api/v1/webhooks/${webhookId}/test`, "POST", {});

  revalidatePath("/settings/integrations");
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function retryWebhookDeliveryAction(formData: FormData) {
  const webhookId = String(formData.get("webhookId") ?? "");
  const deliveryId = String(formData.get("deliveryId") ?? "");
  const returnPath = resolveReturnPath(formData, `/settings/integrations/webhooks/${webhookId}`);

  const result = await requestJson(
    `/api/v1/webhooks/${webhookId}/deliveries/${deliveryId}/retry`,
    "POST",
    {},
  );
  if (!result.ok) return result;

  revalidatePath("/settings/integrations");
  revalidatePath(`/settings/integrations/webhooks/${webhookId}`);
  revalidatePath(returnPath);
  return actionOk();
}

export async function generateCertificateAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const returnPath = resolveReturnPath(formData, `/projects/${projectId}`);

  await requestJsonOrThrow(`/api/v1/projects/${projectId}/certificates/generate`, "POST", {});

  revalidatePath("/certificates");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function revokeCertificateAction(formData: FormData) {
  const certificateId = String(formData.get("certificateId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const returnPath = resolveReturnPath(formData, "/certificates");

  const result = await requestJson(`/api/v1/certificates/${certificateId}/revoke`, "POST", {});
  if (!result.ok) return result;

  revalidatePath("/certificates");
  revalidatePath(`/certificates/${certificateId}`);
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function acceptCertificateAction(formData: FormData) {
  const certificateId = String(formData.get("certificateId") ?? "");
  const returnPath = resolveReturnPath(formData, `/certificates/${certificateId}`);

  const result = await requestJson(`/api/v1/certificates/${certificateId}/accept`, "POST", {
    actorName: String(formData.get("actorName") ?? "客户联系人"),
    comment: String(formData.get("comment") ?? "客户已确认收到交付过程证明。"),
  });
  if (!result.ok) return result;

  revalidatePath("/certificates");
  revalidatePath(`/certificates/${certificateId}`);
  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function changePasswordAction(formData: FormData) {
  const result = await requestJson("/auth/change-password", "POST", {
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
  });
  if (!result.ok) return result;

  revalidatePath("/profile");
  return actionOk();
}

export async function revokeSessionAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const result = await requestJson(`/auth/sessions/${sessionId}/revoke`, "POST", {});
  if (!result.ok) return result;

  revalidatePath("/profile");
  return actionOk();
}
