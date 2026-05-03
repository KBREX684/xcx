import { z } from "zod";
import { agentStatuses, executorTypes, projectStatuses } from "../status";

export const mobileTeamSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  leadName: z.string().nullable(),
  triageEnabled: z.boolean(),
  issueStatuses: z.array(z.string()),
  agentGuidance: z.string().nullable(),
  agentCount: z.number().int().nonnegative(),
  activeAgentCount: z.number().int().nonnegative(),
  projectCount: z.number().int().nonnegative(),
  runningExecutionCount: z.number().int().nonnegative(),
  cycles: z.array(z.record(z.string(), z.unknown())).default([]),
  updatedAt: z.string(),
});

export const mobileTeamBindingSchema = z.object({
  teamId: z.string().min(1),
  agentId: z.string().min(1),
  agentName: z.string(),
  roleName: z.string(),
  transport: z.enum(executorTypes),
  status: z.enum(agentStatuses),
  healthStatus: z.string(),
  capabilities: z.array(z.string()),
});

export const mobileTeamProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  projectCode: z.string(),
  status: z.enum(projectStatuses),
  lastEventAt: z.string().nullable(),
});

export const mobileTeamDetailSchema = mobileTeamSummarySchema.extend({
  leadMemberId: z.string().nullable(),
  bindings: z.array(mobileTeamBindingSchema),
  projects: z.array(mobileTeamProjectSchema),
});

export const mobileTeamListSchema = z.object({
  items: z.array(mobileTeamSummarySchema),
  total: z.number().int().nonnegative(),
});

export type MobileTeamSummary = z.infer<typeof mobileTeamSummarySchema>;
export type MobileTeamBinding = z.infer<typeof mobileTeamBindingSchema>;
export type MobileTeamProject = z.infer<typeof mobileTeamProjectSchema>;
export type MobileTeamDetail = z.infer<typeof mobileTeamDetailSchema>;
export type MobileTeamList = z.infer<typeof mobileTeamListSchema>;
