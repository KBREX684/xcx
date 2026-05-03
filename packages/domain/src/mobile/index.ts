// 移动端 DTO 入口：直接复用 miniapp 已稳定的 schema（auth/approval/project/run/evidence/
// agent/inbox/workflow），只在 mobile 命名空间补充移动端独有的字段（device/release/home
// /telemetry/error）。绝不重复定义同样的契约，避免后端两套表结构漂移。
//
// 使用方式：
//   import { mobile } from "@agent-control-plane/domain";
//   mobile.mobileDeviceRegisterInputSchema.parse(payload);
//
// 也可命名导出 `Mobile*` 类型；每个文件都遵循 "M*" / "Mobile*" 命名。

export * from "./common";
export * from "./device";
export * from "./telemetry";
export * from "./home";
export * from "./workflow";
export * from "./workspace";

// 复用 miniapp 已稳定的契约。注意：仅 re-export，不再起 alias，避免重复定义。
export {
  miniappTokenPairSchema as mobileTokenPairSchema,
  miniappWechatLoginInputSchema as mobileWechatLoginInputSchema,
} from "../miniapp/auth";
export type {
  MiniappTokenPair as MobileTokenPair,
  MiniappWechatLoginInput as MobileWechatLoginInput,
} from "../miniapp/auth";

export {
  miniappApprovalItemSchema as mobileApprovalItemSchema,
  miniappApprovalCenterSchema as mobileApprovalCenterSchema,
  miniappApprovalDecisionInputSchema as mobileApprovalDecisionInputSchema,
  miniappApprovalDecisionResultSchema as mobileApprovalDecisionResultSchema,
} from "../miniapp/approval";
export type {
  MiniappApprovalItem as MobileApprovalItem,
  MiniappApprovalCenter as MobileApprovalCenter,
  MiniappApprovalDecisionInput as MobileApprovalDecisionInput,
} from "../miniapp/approval";

export {
  miniappProjectSummarySchema as mobileProjectSummarySchema,
  miniappProjectOverviewSchema as mobileProjectOverviewSchema,
  miniappTaskSummarySchema as mobileTaskSummarySchema,
  miniappRunSummarySchema as mobileRunSummarySchema,
  miniappCertificateSummarySchema as mobileCertificateSummarySchema,
} from "../miniapp/project";
export type {
  MiniappProjectSummary as MobileProjectSummary,
  MiniappProjectOverview as MobileProjectOverview,
  MiniappTaskSummary as MobileTaskSummary,
  MiniappRunSummary as MobileRunSummary,
  MiniappCertificateSummary as MobileCertificateSummary,
} from "../miniapp/project";

export {
  miniappEvidenceEventSchema as mobileEvidenceEventSchema,
  miniappEvidenceRunSchema as mobileEvidenceRunSchema,
  miniappEvidenceCertificateSchema as mobileEvidenceCertificateSchema,
  miniappEvidenceSummarySchema as mobileEvidenceSummarySchema,
} from "../miniapp/evidence";
export type { MiniappEvidenceSummary as MobileEvidenceSummary } from "../miniapp/evidence";

export {
  miniappAgentStatusSchema as mobileAgentStatusSchema,
} from "../miniapp/agent";
export type { MiniappAgentStatus as MobileAgentStatus } from "../miniapp/agent";

// P1：收件箱（直接复用平台级 inbox schema，移动端只读 + 已读/归档动作）
export {
  miniappInboxFilterSchema as mobileInboxFilterSchema,
  miniappInboxFilterValues as mobileInboxFilterValues,
  miniappInboxQuerySchema as mobileInboxQuerySchema,
  miniappInboxItemSchema as mobileInboxItemSchema,
  miniappInboxActionInputSchema as mobileInboxActionInputSchema,
} from "../miniapp/inbox";
export type {
  MiniappInboxFilter as MobileInboxFilter,
  MiniappInboxQuery as MobileInboxQuery,
  MiniappInboxItem as MobileInboxItem,
  MiniappInboxActionInput as MobileInboxActionInput,
} from "../miniapp/inbox";

// P1：命令搜索 + 会话管理。schema 复用 packages/domain/src/schemas.ts 与 types.ts，
// 不重复声明，避免 schema 漂移。
export { commandSearchQuerySchema as mobileCommandSearchQuerySchema } from "../schemas";
export type { CommandSearchItem as MobileCommandSearchItem, CommandSearchResult as MobileCommandSearchResult } from "../types";

export {
  createAgentInputSchema as mobileCreateAgentInputSchema,
  createProjectInputSchema as mobileCreateProjectInputSchema,
  createTeamInputSchema as mobileCreateTeamInputSchema,
  updateAgentInputSchema as mobileUpdateAgentInputSchema,
  updateAgentTeamsInputSchema as mobileUpdateAgentTeamsInputSchema,
  updateProjectSettingsInputSchema as mobileUpdateProjectSettingsInputSchema,
  updateTeamInputSchema as mobileUpdateTeamInputSchema,
} from "../schemas";
export type {
  CreateAgentInput as MobileCreateAgentInput,
  CreateProjectInput as MobileCreateProjectInput,
  CreateTeamInput as MobileCreateTeamInput,
  ProjectSettingsInput as MobileProjectSettingsInput,
  UpdateAgentInput as MobileUpdateAgentInput,
  UpdateAgentTeamsInput as MobileUpdateAgentTeamsInput,
  UpdateTeamInput as MobileUpdateTeamInput,
} from "../types";
