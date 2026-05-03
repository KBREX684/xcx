import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { ViewHeader } from "../../../../components/view-header";
import { WorkflowTemplateForm } from "../../../../components/workflow-template-form";
import { WorkspaceFrame } from "../../../../components/workspace-frame";
import { getAgents, getTeams, getWorkflowTemplate } from "../../../../lib/api";
import { getScenarioTypeLabel } from "../../../../lib/format";

type EditWorkflowTemplatePageProps = {
  params: Promise<{ templateId: string }>;
};

export default async function EditWorkflowTemplatePage({ params }: EditWorkflowTemplatePageProps) {
  const { templateId } = await params;
  const [workflow, teams, agents] = await Promise.all([
    getWorkflowTemplate(templateId).catch(() => null),
    getTeams(),
    getAgents(),
  ]);

  if (!workflow) {
    notFound();
  }

  return (
    <AppShell
      activeNav="workflows"
      title="编辑流程模板"
      breadcrumbs={[
        { label: "流程模板", href: "/workflows" },
        { label: workflow.name, href: `/workflows/${workflow.id}` },
        { label: "编辑模板" },
      ]}
    >
      <WorkspaceFrame>
        <ViewHeader
          eyebrow={getScenarioTypeLabel(workflow.scenarioType)}
          title="编辑模板"
          description={workflow.name}
          actions={
            <Link href={`/workflows/${workflow.id}`} className="ghost-button">
              返回详情
            </Link>
          }
        />
        <div className="workflow-form-page">
          <WorkflowTemplateForm workflow={workflow} teams={teams} agents={agents} />
        </div>
      </WorkspaceFrame>
    </AppShell>
  );
}
