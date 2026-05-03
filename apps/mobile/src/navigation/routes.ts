export type Route =
  | { name: "Home" }
  | { name: "ApprovalList" }
  | { name: "ApprovalDetail"; runId: string }
  | { name: "TeamList" }
  | { name: "TeamDetail"; teamId: string }
  | { name: "TeamForm"; teamId?: string }
  | { name: "ProjectList" }
  | { name: "ProjectForm"; projectId?: string }
  | { name: "ProjectOverview"; projectId: string; templateId?: string }
  | { name: "WorkflowPicker"; projectId: string; selectedTemplateId?: string }
  | { name: "TaskDetail"; taskId: string }
  | { name: "RunDetail"; runId: string }
  | { name: "WorkflowList" }
  | { name: "WorkflowForm"; templateId?: string }
  | { name: "AgentList" }
  | { name: "AgentDetail"; agentId: string }
  | { name: "AgentForm"; agentId?: string }
  | { name: "CertificateVerify" }
  | { name: "CertificateScan" }
  | { name: "CertificateDetail"; verificationCode: string }
  | { name: "Settings" }
  | { name: "AccountSecurity" }
  | { name: "Preferences" }
  | { name: "ProductGuide" }
  | { name: "OnboardingGuide" }
  | { name: "Inbox" }
  | { name: "InboxDetail"; itemId: string }
  | { name: "Search" }
  | { name: "Legal"; page: "privacy" | "terms" | "sdk" };

export type TabRouteName = "Home" | "TeamList" | "ProjectList" | "Settings";

export interface RouteContext {
  navigate: (route: Route) => void;
  replace: (route: Route) => void;
  goBack: () => void;
  canGoBack: boolean;
  resetToTab: (tab: TabRouteName) => void;
}
