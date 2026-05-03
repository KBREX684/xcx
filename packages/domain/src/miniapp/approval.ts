import { z } from "zod";
import { approvalDecisions } from "../status";
import { miniappClientRequestIdSchema } from "./common";

export const miniappApprovalItemSchema = z.object({
  runId: z.string().min(1),
  taskId: z.string().min(1),
  projectId: z.string().min(1),
  projectName: z.string(),
  projectCode: z.string(),
  taskTitle: z.string(),
  agentName: z.string(),
  capabilityCode: z.string().nullable(),
  requestedAt: z.string(),
  outputSummary: z.string().nullable().optional(),
  traceId: z.string().optional(),
});

export const miniappApprovalCenterSchema = z.object({
  pending: z.array(miniappApprovalItemSchema),
  history: z.array(z.record(z.string(), z.unknown())),
});

export const approvalSummarySchema = z.object({
  pendingCount: z.number().int().nonnegative(),
  latest: z
    .object({
      runId: z.string().min(1),
      taskTitle: z.string(),
      projectName: z.string(),
      requestedAt: z.string(),
    })
    .nullable(),
});

export const miniappApprovalDecisionInputSchema = z.object({
  comment: z.string().trim().max(500, "审批说明不能超过 500 个字").optional(),
  clientRequestId: miniappClientRequestIdSchema.optional(),
});

export const miniappApprovalDecisionResultSchema = z.object({
  decision: z.enum(approvalDecisions),
  runId: z.string().min(1),
  clientRequestId: miniappClientRequestIdSchema.optional(),
});

export type MiniappApprovalItem = z.infer<typeof miniappApprovalItemSchema>;
export type MiniappApprovalCenter = z.infer<typeof miniappApprovalCenterSchema>;
export type ApprovalSummary = z.infer<typeof approvalSummarySchema>;
export type MiniappApprovalDecisionInput = z.infer<typeof miniappApprovalDecisionInputSchema>;

export const EMPTY_APPROVAL_SUMMARY: ApprovalSummary = {
  pendingCount: 0,
  latest: null,
};
