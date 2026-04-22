import { z } from "zod";
import {
  approvalDecisions,
  approvalModes,
  executorTypes,
  notificationChannels,
  objectStorageProviders,
  projectStatuses,
  taskPriorities
} from "./status";

export const createProjectInputSchema = z.object({
  name: z.string().trim().min(2, "项目名称至少 2 个字符").max(40, "项目名称不能超过 40 个字符"),
  customerName: z.string().trim().min(2, "客户名称至少 2 个字符").max(30, "客户名称不能超过 30 个字符")
});

export const createTaskInputSchema = z.object({
  title: z.string().trim().min(2, "任务标题至少 2 个字符").max(60, "任务标题不能超过 60 个字符"),
  description: z.string().trim().min(2, "任务描述至少 2 个字符").max(500, "任务描述不能超过 500 个字符"),
  priority: z.enum(taskPriorities).optional()
});

export const updateProjectSettingsInputSchema = z.object({
  name: z.string().trim().min(2, "项目名称至少 2 个字符").max(40, "项目名称不能超过 40 个字符"),
  customerName: z.string().trim().min(2, "客户名称至少 2 个字符").max(30, "客户名称不能超过 30 个字符"),
  targetDeliveryAt: z.string().trim().max(32).optional(),
  status: z.enum(projectStatuses).optional()
});

export const approvalDecisionInputSchema = z.object({
  approverMemberId: z.string().trim().optional(),
  comment: z.string().trim().max(500, "审批说明不能超过 500 个字符").optional()
});

export const updateIntegrationConfigInputSchema = z.object({
  defaultExecutorType: z.enum(executorTypes),
  objectStorageProvider: z.enum(objectStorageProviders),
  notificationChannel: z.enum(notificationChannels),
  callbackBaseUrl: z.string().trim().max(200).optional(),
  agentEndpoint: z.string().trim().max(200).optional(),
  approvalMode: z.enum(approvalModes)
});

export const approvalDecisionSchema = z.enum(approvalDecisions);
