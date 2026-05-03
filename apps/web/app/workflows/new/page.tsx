import Link from "next/link";
import { AppShell } from "../../../components/app-shell";
import { ViewHeader } from "../../../components/view-header";
import { WorkflowTemplateForm } from "../../../components/workflow-template-form";
import { WorkspaceFrame } from "../../../components/workspace-frame";
import { getAgents, getTeams } from "../../../lib/api";

export default async function NewWorkflowTemplatePage() {
  const [teams, agents] = await Promise.all([getTeams(), getAgents()]);

  return (
    <AppShell
      activeNav="workflows"
      title="创建流程模板"
      breadcrumbs={[{ label: "流程模板", href: "/workflows" }, { label: "创建模板" }]}
    >
      <WorkspaceFrame>
        <ViewHeader
          eyebrow="流程模板"
          title="创建模板"
          description="用可视化节点搭建一个可复用的智能体协作流程。"
          actions={
            <Link href="/workflows" className="ghost-button">
              返回列表
            </Link>
          }
        />
        <div className="workflow-form-page">
          <WorkflowTemplateForm teams={teams} agents={agents} />
        </div>
      </WorkspaceFrame>
    </AppShell>
  );
}
