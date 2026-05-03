import { z } from "zod";
import { miniappClientRequestIdSchema } from "./common";

export const miniappWorkflowTemplateSummarySchema = z.object({
  id: z.string().min(1),
  templateCode: z.string().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  scenarioType: z.string().optional(),
  version: z.string().optional(),
});

export const miniappWorkflowTriggerInputSchema = z.object({
  clientRequestId: miniappClientRequestIdSchema.optional(),
});

export const miniappWorkflowTriggerResultSchema = z.object({
  runId: z.string().min(1),
});

export type MiniappWorkflowTemplateSummary = z.infer<
  typeof miniappWorkflowTemplateSummarySchema
>;
export type MiniappWorkflowTriggerInput = z.infer<typeof miniappWorkflowTriggerInputSchema>;
export type MiniappWorkflowTriggerResult = z.infer<typeof miniappWorkflowTriggerResultSchema>;
