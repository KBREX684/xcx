// 移动端聚合首屏：避免 N 次请求拼接首页。后端 GET /api/v1/mobile/home 一次返回。
// 字段相对 Web Dashboard 极度精简，符合"移动控制面，不是看板"的设计原则。
import { z } from "zod";
import { miniappAgentStatusSchema } from "../miniapp/agent";
import { miniappApprovalItemSchema } from "../miniapp/approval";
import { miniappProjectSummarySchema } from "../miniapp/project";

export const mobileHomeSummarySchema = z.object({
  pendingApprovalCount: z.number().int().nonnegative(),
  failingRunsCount: z.number().int().nonnegative(),
  evidenceExceptionCount: z.number().int().nonnegative(),
  unreadInboxCount: z.number().int().nonnegative(),
  /** 最近 3 条待我处理的审批，控制详情拉取频次。 */
  topApprovals: z.array(miniappApprovalItemSchema).max(5),
  /** 最近 3 个我所在项目的健康卡片。 */
  topProjects: z.array(miniappProjectSummarySchema).max(5),
  /** 最近 3 个高负载/异常 Agent，便于一键打开。 */
  watchAgents: z.array(miniappAgentStatusSchema).max(5),
  generatedAt: z.string(),
});
export type MobileHomeSummary = z.infer<typeof mobileHomeSummarySchema>;
