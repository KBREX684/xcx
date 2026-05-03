import { z } from "zod";
import {
  certificateStatuses,
  projectStatuses,
  runStatuses,
  taskPriorities,
  taskStatuses,
} from "../status";

export const miniappProjectSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  projectCode: z.string(),
  status: z.enum(projectStatuses),
  customerName: z.string(),
  description: z.string().nullable().optional(),
  taskCount: z.number().int().nonnegative(),
  completedTaskCount: z.number().int().nonnegative(),
  teamId: z.string().nullable().optional(),
  teamName: z.string().nullable(),
  health: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
});

export const miniappCertificateSummarySchema = z.object({
  id: z.string().min(1),
  certificateNo: z.string(),
  title: z.string(),
  status: z.enum(certificateStatuses),
  version: z.number().int().nonnegative(),
  issuedAt: z.string().nullable(),
  acceptedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  verificationCode: z.string(),
  verificationUrl: z.string(),
});

export const miniappTaskSummarySchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(taskStatuses),
  priority: z.enum(taskPriorities),
  sequenceNo: z.number().int(),
  currentRunId: z.string().nullable().optional(),
  currentRunStatus: z.enum(runStatuses).nullable(),
  waitingHumanReview: z.boolean(),
  latestOutputSummary: z.string().nullable().optional(),
  delegateAgentName: z.string().nullable().optional(),
  dueAt: z.string().nullable().optional(),
});

export const miniappProjectMilestoneSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  status: z.string(),
  targetAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export const miniappRunSummarySchema = z.object({
  id: z.string().min(1),
  status: z.enum(runStatuses),
  agentName: z.string(),
  taskTitle: z.string(),
  outputSummary: z.string().nullable(),
  errorMessage: z.string().nullable().optional(),
  traceId: z.string(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  executorType: z.string(),
  artifacts: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const miniappProjectOverviewSchema = miniappProjectSummarySchema.extend({
  ownerName: z.string().optional(),
  targetDeliveryAt: z.string().nullable().optional(),
  pendingApprovalCount: z.number().int().nonnegative().optional(),
  currentCertificateId: z.string().nullable().optional(),
  latestCertificate: z.record(z.string(), z.unknown()).nullable().optional(),
  latestEventSummary: z.string().nullable().optional(),
  hashChainHealthy: z.boolean(),
  chainHeadHash: z.string().nullable(),
  milestones: z.array(miniappProjectMilestoneSchema).optional(),
  recentRuns: z.array(miniappRunSummarySchema).optional(),
});

export type MiniappProjectSummary = z.infer<typeof miniappProjectSummarySchema>;
export type MiniappProjectOverview = z.infer<typeof miniappProjectOverviewSchema>;
export type MiniappTaskSummary = z.infer<typeof miniappTaskSummarySchema>;
export type MiniappRunSummary = z.infer<typeof miniappRunSummarySchema>;
export type MiniappCertificateSummary = z.infer<typeof miniappCertificateSummarySchema>;
