import { z } from "zod";
import { executorTypes, workflowTemplateStatuses } from "../status";

export const mobileWorkflowNodeTypes = ["task", "approval", "condition", "parallel", "end"] as const;

export const mobileWorkflowTemplateNodeSchema = z
  .object({
    key: z.string().trim().min(1).max(60),
    type: z.enum(mobileWorkflowNodeTypes),
    name: z.string().trim().min(1).max(120),
    boundAgentId: z.string().trim().min(1).optional().or(z.literal("")),
    capabilityCode: z.string().trim().min(1).max(120).optional().or(z.literal("")),
    transport: z.enum(executorTypes).nullable().optional(),
    predicate: z.string().trim().min(1).max(500).optional(),
    trueBranchKey: z.string().trim().min(1).max(60).optional(),
    falseBranchKey: z.string().trim().min(1).max(60).optional(),
    branchKeys: z.array(z.string().trim().min(1).max(60)).min(2).max(16).optional(),
    joinStrategy: z.enum(["all", "any"]).optional(),
  })
  .superRefine((node, ctx) => {
    if (node.type === "condition") {
      if (!node.predicate) {
        ctx.addIssue({ code: "custom", path: ["predicate"], message: "condition predicate required" });
      }
      if (!node.trueBranchKey || !node.falseBranchKey) {
        ctx.addIssue({ code: "custom", path: ["trueBranchKey"], message: "condition branches required" });
      }
    }
    if (node.type === "parallel") {
      if (!node.branchKeys || node.branchKeys.length < 2) {
        ctx.addIssue({ code: "custom", path: ["branchKeys"], message: "parallel branches required" });
      }
      if (!node.joinStrategy) {
        ctx.addIssue({ code: "custom", path: ["joinStrategy"], message: "parallel join strategy required" });
      }
    }
  });

export const mobileWorkflowTemplateSummarySchema = z.object({
  id: z.string().min(1),
  teamId: z.string().nullable().optional(),
  teamName: z.string().nullable().optional(),
  name: z.string(),
  scenarioType: z.string(),
  version: z.string(),
  triggerType: z.string(),
  status: z.enum(workflowTemplateStatuses),
  nodeCount: z.number().int().nonnegative(),
  usageCount: z.number().int().nonnegative(),
  lastTriggeredAt: z.string().nullable(),
});

export const mobileWorkflowTemplateDetailSchema = mobileWorkflowTemplateSummarySchema.extend({
  nodes: z.array(mobileWorkflowTemplateNodeSchema),
});

export const mobileWorkflowTemplateInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  scenarioType: z.string().trim().min(2).max(80),
  version: z.string().trim().min(1).max(30).default("1.0.0"),
  triggerType: z.enum(["manual", "webhook", "scheduled"]).default("manual"),
  status: z.enum(workflowTemplateStatuses).default("active"),
  teamId: z.string().trim().min(1).nullable().optional().or(z.literal("")),
  nodes: z.array(mobileWorkflowTemplateNodeSchema).min(1).max(30),
});

export const mobileWorkflowTemplateListSchema = z.object({
  items: z.array(mobileWorkflowTemplateSummarySchema),
  total: z.number().int().nonnegative(),
});

export const mobileWorkflowTriggerResultSchema = z.object({
  runId: z.string().min(1),
  traceId: z.string().optional(),
  clientRequestId: z.string().optional(),
});

export type MobileWorkflowTemplateNode = z.infer<typeof mobileWorkflowTemplateNodeSchema>;
export type MobileWorkflowTemplateSummary = z.infer<typeof mobileWorkflowTemplateSummarySchema>;
export type MobileWorkflowTemplateDetail = z.infer<typeof mobileWorkflowTemplateDetailSchema>;
export type MobileWorkflowTemplateInput = z.infer<typeof mobileWorkflowTemplateInputSchema>;
export type MobileWorkflowTemplateList = z.infer<typeof mobileWorkflowTemplateListSchema>;
export type MobileWorkflowTriggerResult = z.infer<typeof mobileWorkflowTriggerResultSchema>;
