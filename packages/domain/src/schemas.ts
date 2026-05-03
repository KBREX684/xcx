import { z } from "zod";
import {
  agentInstructionStatuses,
  agentStatuses,
  approvalDecisions,
  approvalModes,
  cycleStatuses,
  evidenceEntityTypes,
  executorTypes,
  inboxItemKinds,
  notificationChannels,
  objectStorageProviders,
  projectStatuses,
  savedViewScopes,
  taskRelationTypes,
  taskPriorities,
  taskStatuses,
  threadStatuses,
} from "./status";

export const createProjectInputSchema = z.object({
  name: z.string().trim().min(2, "项目名称至少 2 个字").max(40, "项目名称不能超过 40 个字"),
  customerName: z.string().trim().min(2, "客户名称至少 2 个字").max(30, "客户名称不能超过 30 个字"),
  description: z
    .string()
    .trim()
    .max(1000, "项目说明不能超过 1000 个字")
    .optional()
    .or(z.literal("")),
  health: z.string().trim().min(1).max(40).optional(),
  priority: z.string().trim().min(1).max(40).optional(),
  teamId: z.string().trim().min(1, "请选择项目所属团队"),
});

const teamAgentIdsSchema = z.array(z.string().trim().min(1)).max(20);

export const createTeamInputSchema = z.object({
  name: z.string().trim().min(2, "团队名称至少 2 个字").max(30, "团队名称不能超过 30 个字"),
  description: z
    .string()
    .trim()
    .max(200, "团队说明不能超过 200 个字")
    .nullable()
    .optional()
    .or(z.literal("")),
  agentIds: teamAgentIdsSchema,
  triageEnabled: z.boolean().optional(),
  issueStatuses: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  agentGuidance: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const updateTeamInputSchema = createTeamInputSchema;

export const createTaskInputSchema = z.object({
  title: z.string().trim().min(2, "任务标题至少 2 个字").max(60, "任务标题不能超过 60 个字"),
  description: z
    .string()
    .trim()
    .min(2, "任务描述至少 2 个字")
    .max(500, "任务描述不能超过 500 个字"),
  priority: z.enum(taskPriorities).optional(),
  parentId: z.string().trim().min(3).max(128).nullable().optional(),
});

export const updateTaskParentInputSchema = z.object({
  parentId: z.string().trim().min(3).max(128).nullable(),
});

export const createTaskRelationInputSchema = z.object({
  targetTaskId: z.string().trim().min(3).max(128),
  relationType: z.enum(taskRelationTypes),
});

export const createWebhookInputSchema = z.object({
  url: z.string().trim().url(),
  events: z.array(z.string().trim().min(1).max(120)).min(1).max(50),
  secret: z.string().trim().min(12).max(200).optional(),
});

export const updateProjectSettingsInputSchema = z.object({
  name: z.string().trim().min(2, "项目名称至少 2 个字").max(40, "项目名称不能超过 40 个字"),
  customerName: z.string().trim().min(2, "客户名称至少 2 个字").max(30, "客户名称不能超过 30 个字"),
  description: z
    .string()
    .trim()
    .max(1000, "项目说明不能超过 1000 个字")
    .nullable()
    .optional()
    .or(z.literal("")),
  health: z.string().trim().min(1).max(40).optional(),
  priority: z.string().trim().min(1).max(40).optional(),
  targetDeliveryAt: z.string().datetime().nullable().optional(),
  status: z.enum(projectStatuses).optional(),
  teamId: z.string().trim().min(1, "请选择项目所属团队"),
});

export const createIssueInputSchema = z.object({
  projectId: z.string().trim().min(1, "请选择项目"),
  title: z.string().trim().min(2, "Issue 标题至少 2 个字").max(80, "Issue 标题不能超过 80 个字"),
  description: z
    .string()
    .trim()
    .min(1, "请输入 Issue 说明")
    .max(2000, "Issue 说明不能超过 2000 个字"),
  priority: z.enum(taskPriorities).optional(),
  status: z.enum(taskStatuses).optional(),
  delegateAgentId: z.string().trim().min(1).optional().or(z.literal("")),
  cycleId: z.string().trim().min(1).optional().or(z.literal("")),
});

export const issueListQuerySchema = z.object({
  scope: z.enum(["workspace", "team", "project", "my"]).optional(),
  teamId: z.string().trim().min(1).optional(),
  projectId: z.string().trim().min(1).optional(),
  viewId: z.string().trim().min(1).optional(),
  status: z.enum(taskStatuses).optional(),
  statusGroup: z.enum(["triage", "active", "backlog", "todo", "done", "all"]).optional(),
  priority: z.enum(taskPriorities).optional(),
  assigneeId: z.string().trim().min(1).optional(),
  delegateAgentId: z.string().trim().min(1).optional(),
  cycleId: z.string().trim().min(1).optional(),
  q: z.string().trim().max(120).optional(),
});

export const updateIssueInputSchema = z.object({
  title: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  ownerMemberId: z.string().trim().min(1).nullable().optional().or(z.literal("")),
  delegateAgentId: z.string().trim().min(1).nullable().optional().or(z.literal("")),
  dueAt: z.string().datetime().nullable().optional().or(z.literal("")),
  cycleId: z.string().trim().min(1).nullable().optional().or(z.literal("")),
  blockedReason: z.string().trim().max(500).nullable().optional().or(z.literal("")),
});

export const createCycleInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  status: z.enum(cycleStatuses).default("planned"),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export const updateCycleInputSchema = createCycleInputSchema.partial();

export const inboxActionInputSchema = z.object({
  itemIds: z.array(z.string().trim().min(1)).min(1).max(50),
});

export const commandSearchQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
});

export const taskAssignmentInputSchema = z.object({
  agentId: z.string().trim().min(1, "请选择要委派的 Agent"),
  note: z.string().trim().max(500, "委派说明不能超过 500 个字").optional(),
});

export const taskMessageInputSchema = z.object({
  body: z.string().trim().min(1, "请输入评论内容").max(2000, "评论内容不能超过 2000 个字"),
  mentionAgentIds: z.array(z.string().trim().min(1)).max(10).optional(),
});

export const messageReplyInputSchema = taskMessageInputSchema;

export const messageEditInputSchema = z.object({
  body: z.string().trim().min(1, "请输入评论内容").max(2000, "评论内容不能超过 2000 个字"),
});

export const threadResolveInputSchema = z.object({
  resolved: z.boolean(),
});

export const approvalDecisionInputSchema = z.object({
  comment: z.string().trim().max(500, "审批说明不能超过 500 个字").optional(),
  clientRequestId: z
    .string()
    .trim()
    .min(8)
    .max(128)
    .regex(/^[A-Za-z0-9._:-]+$/, "clientRequestId contains unsupported characters")
    .optional(),
});

export const updateIntegrationConfigInputSchema = z.object({
  defaultExecutorType: z.enum(executorTypes),
  objectStorageProvider: z.enum(objectStorageProviders),
  notificationChannel: z.enum(notificationChannels),
  approvalMode: z.enum(approvalModes),
  callbackBaseUrl: z.string().trim().url().nullable().optional().or(z.literal("")),
  openapiBaseUrl: z.string().trim().url().nullable().optional().or(z.literal("")),
  mcpRelayBaseUrl: z.string().trim().url().nullable().optional().or(z.literal("")),
});

export const createAgentInputSchema = z.object({
  name: z.string().trim().min(2).max(40),
  roleName: z.string().trim().min(2).max(40),
  description: z.string().trim().min(2).max(300),
  transport: z.enum(executorTypes),
  capabilities: z.array(z.string().trim().min(1)).min(1),
  tags: z.array(z.string().trim().min(1)).optional(),
});

export const updateAgentInputSchema = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  roleName: z.string().trim().min(2).max(40).optional(),
  description: z.string().trim().min(2).max(300).optional(),
  status: z.enum(agentStatuses).optional(),
  transport: z.enum(executorTypes).optional(),
  capabilities: z.array(z.string().trim().min(1)).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
});

export const updateAgentTeamsInputSchema = z.object({
  teamIds: z.array(z.string().trim().min(1)).max(20),
});

const savedViewFiltersSchema = z.record(z.string(), z.unknown()).default({});

export const createSavedViewInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  scope: z.enum(savedViewScopes).default("workspace"),
  teamId: z.string().trim().min(1).nullable().optional().or(z.literal("")),
  projectId: z.string().trim().min(1).nullable().optional().or(z.literal("")),
  filters: savedViewFiltersSchema,
  sort: z.record(z.string(), z.unknown()).nullable().optional(),
  displayColumns: z.array(z.string().trim().min(1)).max(30).nullable().optional(),
});

export const updateSavedViewInputSchema = createSavedViewInputSchema.partial();

export const workflowTemplateNodeInputSchema = z
  .object({
    key: z.string().trim().min(1).max(60),
    type: z.enum(["task", "approval", "condition", "parallel", "end"]),
    name: z.string().trim().min(1).max(120),
    boundAgentId: z.string().trim().min(1).optional().or(z.literal("")),
    capabilityCode: z.string().trim().min(1).max(120).optional().or(z.literal("")),
    transport: z.enum(executorTypes).nullable().optional(),
    // condition-only:
    predicate: z.string().trim().min(1).max(500).optional(),
    trueBranchKey: z.string().trim().min(1).max(60).optional(),
    falseBranchKey: z.string().trim().min(1).max(60).optional(),
    // parallel-only:
    branchKeys: z.array(z.string().trim().min(1).max(60)).min(2).max(16).optional(),
    joinStrategy: z.enum(["all", "any"]).optional(),
  })
  .superRefine((node, ctx) => {
    if (node.type === "condition") {
      if (!node.predicate) {
        ctx.addIssue({
          code: "custom",
          path: ["predicate"],
          message: "condition nodes require a predicate",
        });
      }
      if (!node.trueBranchKey || !node.falseBranchKey) {
        ctx.addIssue({
          code: "custom",
          path: ["trueBranchKey"],
          message: "condition nodes require trueBranchKey and falseBranchKey",
        });
      }
    }
    if (node.type === "parallel") {
      if (!node.branchKeys || node.branchKeys.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["branchKeys"],
          message: "parallel nodes require at least 2 branchKeys",
        });
      }
      if (!node.joinStrategy) {
        ctx.addIssue({
          code: "custom",
          path: ["joinStrategy"],
          message: "parallel nodes require a joinStrategy ('all' | 'any')",
        });
      }
    }
  });

export const createWorkflowTemplateInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  scenarioType: z.string().trim().min(2).max(80),
  version: z.string().trim().min(1).max(30).default("1.0.0"),
  triggerType: z.enum(["manual", "webhook", "scheduled"]).default("manual"),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
  teamId: z.string().trim().min(1).nullable().optional().or(z.literal("")),
  nodes: z.array(workflowTemplateNodeInputSchema).min(1).max(30),
});

export const updateWorkflowTemplateInputSchema = createWorkflowTemplateInputSchema.partial();

export const evidenceEntityTypeSchema = z.enum(evidenceEntityTypes);

export const agentHeartbeatInputSchema = z.object({
  healthStatus: z.string().trim().min(2).max(40),
});

export const certificateAcceptInputSchema = z.object({
  comment: z.string().trim().max(500).optional(),
  actorName: z.string().trim().max(60).optional(),
});

export const approvalDecisionSchema = z.enum(approvalDecisions);
export const threadStatusSchema = z.enum(threadStatuses);
export const agentInstructionStatusSchema = z.enum(agentInstructionStatuses);
export const inboxItemKindSchema = z.enum(inboxItemKinds);
