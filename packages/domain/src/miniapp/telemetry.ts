import { z } from "zod";

export const miniappKeyPathEvents = [
  "login_success",
  "approval_decided",
  "certificate_verified",
  "workflow_triggered",
] as const;

export const miniappErrorReportSchema = z.object({
  message: z.string().min(1).max(500),
  level: z.enum(["fatal", "error", "warn"]).optional(),
  page: z.string().max(120).optional(),
  appVersion: z.string().max(40).optional(),
  stack: z.string().max(4000).optional(),
  context: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  occurredAt: z.string().optional(),
});

export const miniappEventReportSchema = z.object({
  name: z.enum(miniappKeyPathEvents),
  outcome: z.enum(["success", "error"]).default("success"),
  appVersion: z.string().max(40).optional(),
  occurredAt: z.string().optional(),
});

export type MiniappKeyPathEvent = (typeof miniappKeyPathEvents)[number];
export type MiniappErrorReport = z.infer<typeof miniappErrorReportSchema>;
export type MiniappEventReport = z.infer<typeof miniappEventReportSchema>;
