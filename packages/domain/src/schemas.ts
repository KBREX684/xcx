import { z } from "zod";
import { approvalDecisions, taskPriorities } from "./status";

export const createProjectInputSchema = z.object({
  name: z.string().trim().min(2, "项目名称至少 2 个字符").max(40, "项目名称不能超过 40 个字符"),
  customerName: z.string().trim().min(2, "客户名称至少 2 个字符").max(30, "客户名称不能超过 30 个字符")
});

export const createTaskInputSchema = z.object({
  title: z.string().trim().min(2).max(60),
  description: z.string().trim().min(2).max(500),
  priority: z.enum(taskPriorities).optional()
});

export const approvalDecisionInputSchema = z.object({
  approverMemberId: z.string().trim().optional(),
  comment: z.string().trim().max(500).optional()
});

export const approvalDecisionSchema = z.enum(approvalDecisions);

