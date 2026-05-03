import { z } from "zod";
import { agentOperatingStates, agentStatuses, executorTypes } from "../status";

export const miniappAgentStatusSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  roleName: z.string(),
  transport: z.enum(executorTypes),
  capabilities: z.array(z.string()),
  status: z.enum(agentStatuses),
  operatingState: z.enum(agentOperatingStates),
  healthStatus: z.string(),
  description: z.string(),
  lastSeenAt: z.string().nullable(),
  taskCount: z.number().int().nonnegative(),
  runCount: z.number().int().nonnegative(),
  activeRunCount: z.number().int().nonnegative(),
  waitingReviewCount: z.number().int().nonnegative(),
  successRate: z.number().nullable(),
  estimatedCostCents: z.number().nullable(),
  tags: z.array(z.string()).optional(),
  boundTeams: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
    }),
  ),
});

export type MiniappAgentStatus = z.infer<typeof miniappAgentStatusSchema>;
