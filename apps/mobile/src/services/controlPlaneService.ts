import { z } from "zod";
import {
  mobileAgentStatusSchema,
  mobileApprovalCenterSchema,
  mobileApprovalDecisionInputSchema,
  mobileCertificateSummarySchema,
  mobileCreateAgentInputSchema,
  mobileCreateProjectInputSchema,
  mobileCreateTeamInputSchema,
  mobileEvidenceSummarySchema,
  mobileHomeSummarySchema,
  mobileProjectOverviewSchema,
  mobileProjectSummarySchema,
  mobileTeamDetailSchema,
  mobileTeamListSchema,
  mobileUpdateAgentInputSchema,
  mobileUpdateAgentTeamsInputSchema,
  mobileUpdateProjectSettingsInputSchema,
  mobileUpdateTeamInputSchema,
  mobileWorkflowTemplateDetailSchema,
  mobileWorkflowTemplateInputSchema,
  mobileWorkflowTemplateListSchema,
  mobileWorkflowTriggerResultSchema,
  type MobileAgentStatus,
  type MobileApiResult,
  type MobileApprovalCenter,
  type MobileApprovalDecisionInput,
  type MobileCertificateSummary,
  type MobileCreateAgentInput,
  type MobileCreateProjectInput,
  type MobileCreateTeamInput,
  type MobileEvidenceSummary,
  type MobileHomeSummary,
  type MobileProjectOverview,
  type MobileProjectSettingsInput,
  type MobileProjectSummary,
  type MobileTeamDetail,
  type MobileTeamList,
  type MobileUpdateAgentInput,
  type MobileUpdateAgentTeamsInput,
  type MobileUpdateTeamInput,
  type MobileWorkflowTemplateDetail,
  type MobileWorkflowTemplateInput,
  type MobileWorkflowTemplateList,
  type MobileWorkflowTriggerResult,
} from "@agent-control-plane/domain/src/mobile";
import { apiClient } from "./apiClient";
import { staleCache } from "../cache/staleCache";

async function withStaleCache<T>(
  scope: string,
  exec: () => Promise<MobileApiResult<T>>,
): Promise<MobileApiResult<T>> {
  const res = await exec();
  if (res.ok) {
    void staleCache.write(scope, res.data);
    return res;
  }
  if (res.error.code !== "NETWORK_OFFLINE" && res.error.code !== "NETWORK_TIMEOUT") return res;
  const cached = await staleCache.read<T>(scope);
  if (!cached) return res;
  return { ok: true, data: cached.data };
}

export const homeService = {
  fetchHome(memberId?: string) {
    const scope = `home.${memberId ?? "anon"}`;
    return withStaleCache<MobileHomeSummary>(scope, () =>
      apiClient.request<MobileHomeSummary>({
        path: "/api/v1/mobile/home",
        schema: mobileHomeSummarySchema,
      }),
    );
  },
};

export const approvalService = {
  fetchCenter() {
    return apiClient.request<MobileApprovalCenter>({
      path: "/api/v1/mobile/approvals",
      schema: mobileApprovalCenterSchema,
    });
  },
  fetchEvidence(runId: string) {
    return apiClient.request<MobileEvidenceSummary>({
      path: `/api/v1/mobile/approvals/${encodeURIComponent(runId)}/evidence`,
      schema: mobileEvidenceSummarySchema,
    });
  },
  approve(runId: string, body: MobileApprovalDecisionInput) {
    mobileApprovalDecisionInputSchema.parse(body);
    return apiClient.request({
      path: `/api/v1/mobile/approvals/${encodeURIComponent(runId)}/approve`,
      method: "POST",
      body,
      idempotencyPrefix: "approval",
    });
  },
  reject(runId: string, body: MobileApprovalDecisionInput) {
    mobileApprovalDecisionInputSchema.parse(body);
    return apiClient.request({
      path: `/api/v1/mobile/approvals/${encodeURIComponent(runId)}/reject`,
      method: "POST",
      body,
      idempotencyPrefix: "approval",
    });
  },
};

const projectListSchema = z.object({
  items: z.array(mobileProjectSummarySchema),
  total: z.number().int().nonnegative(),
});

export const teamService = {
  list(params?: { keyword?: string; limit?: number }, memberId?: string) {
    const paramKey = params && Object.keys(params).length ? JSON.stringify(params) : "all";
    const scope = `teams.${memberId ?? "anon"}.${paramKey}`;
    return withStaleCache<MobileTeamList>(scope, () =>
      apiClient.request<MobileTeamList>({
        path: "/api/v1/mobile/teams",
        query: params,
        schema: mobileTeamListSchema,
      }),
    );
  },
  detail(teamId: string) {
    return apiClient.request<MobileTeamDetail>({
      path: `/api/v1/mobile/teams/${encodeURIComponent(teamId)}`,
      schema: mobileTeamDetailSchema,
    });
  },
  create(input: MobileCreateTeamInput) {
    const body = mobileCreateTeamInputSchema.parse(input);
    return apiClient.request<MobileTeamDetail>({
      path: "/api/v1/mobile/teams",
      method: "POST",
      body,
      schema: mobileTeamDetailSchema,
      idempotencyPrefix: "team-create",
    });
  },
  update(teamId: string, input: MobileUpdateTeamInput) {
    const body = mobileUpdateTeamInputSchema.parse(input);
    return apiClient.request<MobileTeamDetail>({
      path: `/api/v1/mobile/teams/${encodeURIComponent(teamId)}`,
      method: "PUT",
      body,
      schema: mobileTeamDetailSchema,
      idempotencyPrefix: "team-update",
    });
  },
};

const mobileRunDetailSchema = z.object({
  id: z.string().min(1),
  status: z.string(),
  agentName: z.string(),
  taskTitle: z.string(),
  outputSummary: z.string().nullable(),
  errorMessage: z.string().nullable().optional(),
  traceId: z.string(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  executorType: z.string(),
  artifacts: z.array(z.record(z.string(), z.unknown())).optional(),
});

type MobileRunDetail = z.infer<typeof mobileRunDetailSchema>;

export const projectService = {
  list(
    params?: { keyword?: string; status?: string; cursor?: string; limit?: number },
    memberId?: string,
  ) {
    const paramKey = params && Object.keys(params).length ? JSON.stringify(params) : "all";
    const scope = `projects.${memberId ?? "anon"}.${paramKey}`;
    return withStaleCache<{ items: MobileProjectSummary[]; total: number }>(scope, () =>
      apiClient.request<{ items: MobileProjectSummary[]; total: number }>({
        path: "/api/v1/mobile/projects",
        query: params,
        schema: projectListSchema,
      }),
    );
  },
  overview(projectId: string) {
    return apiClient.request<MobileProjectOverview>({
      path: `/api/v1/mobile/projects/${encodeURIComponent(projectId)}/overview`,
      schema: mobileProjectOverviewSchema,
    });
  },
  create(input: MobileCreateProjectInput) {
    const body = mobileCreateProjectInputSchema.parse(input);
    return apiClient.request<MobileProjectSummary>({
      path: "/api/v1/mobile/projects",
      method: "POST",
      body,
      schema: mobileProjectSummarySchema,
      idempotencyPrefix: "project-create",
    });
  },
  update(projectId: string, input: MobileProjectSettingsInput) {
    const body = mobileUpdateProjectSettingsInputSchema.parse(input);
    return apiClient.request<MobileProjectOverview>({
      path: `/api/v1/mobile/projects/${encodeURIComponent(projectId)}`,
      method: "PUT",
      body,
      schema: mobileProjectOverviewSchema,
      idempotencyPrefix: "project-update",
    });
  },
  triggerWorkflow(projectId: string, templateId: string, clientRequestId: string) {
    return apiClient.request<MobileWorkflowTriggerResult>({
      path: `/api/v1/mobile/projects/${encodeURIComponent(projectId)}/workflows/${encodeURIComponent(
        templateId,
      )}/trigger`,
      method: "POST",
      body: { clientRequestId },
      schema: mobileWorkflowTriggerResultSchema,
      idempotencyPrefix: "workflow-trigger",
      timeoutMs: 45_000,
    });
  },
};

export const runService = {
  detail(runId: string) {
    return apiClient.request<MobileRunDetail>({
      path: `/api/v1/mobile/runs/${encodeURIComponent(runId)}`,
      schema: mobileRunDetailSchema,
    });
  },
  evidence(runId: string) {
    return apiClient.request<MobileEvidenceSummary>({
      path: `/api/v1/mobile/runs/${encodeURIComponent(runId)}/evidence`,
      schema: mobileEvidenceSummarySchema,
    });
  },
};

const agentListSchema = z.object({
  items: z.array(mobileAgentStatusSchema),
});

export const agentService = {
  list(memberId?: string) {
    const scope = `agents.${memberId ?? "anon"}`;
    return withStaleCache<{ items: MobileAgentStatus[] }>(scope, () =>
      apiClient.request<{ items: MobileAgentStatus[] }>({
        path: "/api/v1/mobile/agents",
        schema: agentListSchema,
      }),
    );
  },
  detail(agentId: string) {
    return apiClient.request<MobileAgentStatus>({
      path: `/api/v1/mobile/agents/${encodeURIComponent(agentId)}`,
      schema: mobileAgentStatusSchema,
    });
  },
  create(input: MobileCreateAgentInput) {
    const body = mobileCreateAgentInputSchema.parse(input);
    return apiClient.request<MobileAgentStatus>({
      path: "/api/v1/mobile/agents",
      method: "POST",
      body,
      schema: mobileAgentStatusSchema,
      idempotencyPrefix: "agent-create",
    });
  },
  update(agentId: string, input: MobileUpdateAgentInput) {
    const body = mobileUpdateAgentInputSchema.parse(input);
    return apiClient.request<MobileAgentStatus>({
      path: `/api/v1/mobile/agents/${encodeURIComponent(agentId)}`,
      method: "PATCH",
      body,
      schema: mobileAgentStatusSchema,
      idempotencyPrefix: "agent-update",
    });
  },
  updateTeams(agentId: string, input: MobileUpdateAgentTeamsInput) {
    const body = mobileUpdateAgentTeamsInputSchema.parse(input);
    return apiClient.request<MobileAgentStatus>({
      path: `/api/v1/mobile/agents/${encodeURIComponent(agentId)}/teams`,
      method: "PATCH",
      body,
      schema: mobileAgentStatusSchema,
      idempotencyPrefix: "agent-teams",
    });
  },
};

export const workflowService = {
  list(params?: { keyword?: string; status?: string; limit?: number }, memberId?: string) {
    const paramKey = params && Object.keys(params).length ? JSON.stringify(params) : "all";
    const scope = `workflows.${memberId ?? "anon"}.${paramKey}`;
    return withStaleCache<MobileWorkflowTemplateList>(scope, () =>
      apiClient.request<MobileWorkflowTemplateList>({
        path: "/api/v1/mobile/workflows",
        query: params,
        schema: mobileWorkflowTemplateListSchema,
      }),
    );
  },
  detail(templateId: string) {
    return apiClient.request<MobileWorkflowTemplateDetail>({
      path: `/api/v1/mobile/workflows/${encodeURIComponent(templateId)}`,
      schema: mobileWorkflowTemplateDetailSchema,
    });
  },
  create(input: MobileWorkflowTemplateInput) {
    const body = mobileWorkflowTemplateInputSchema.parse(input);
    return apiClient.request<MobileWorkflowTemplateDetail>({
      path: "/api/v1/mobile/workflows",
      method: "POST",
      body,
      schema: mobileWorkflowTemplateDetailSchema,
      idempotencyPrefix: "workflow-create",
    });
  },
  update(templateId: string, input: MobileWorkflowTemplateInput) {
    const body = mobileWorkflowTemplateInputSchema.parse(input);
    return apiClient.request<MobileWorkflowTemplateDetail>({
      path: `/api/v1/mobile/workflows/${encodeURIComponent(templateId)}`,
      method: "PATCH",
      body,
      schema: mobileWorkflowTemplateDetailSchema,
      idempotencyPrefix: "workflow-update",
    });
  },
};

export const certificateService = {
  fetchByCode(verificationCode: string) {
    return apiClient.request<MobileCertificateSummary>({
      path: `/api/v1/mobile/certificates/${encodeURIComponent(verificationCode)}`,
      schema: mobileCertificateSummarySchema,
      anonymous: true,
    });
  },
  fetchEvidence(verificationCode: string) {
    return apiClient.request<MobileEvidenceSummary>({
      path: `/api/v1/mobile/certificates/${encodeURIComponent(verificationCode)}/evidence`,
      schema: mobileEvidenceSummarySchema,
      anonymous: true,
    });
  },
};
