import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { DataList, DataListCell } from "../../components/data-list";
import { ViewHeader } from "../../components/view-header";
import { WorkspaceFrame } from "../../components/workspace-frame";
import { getWorkflowTemplates } from "../../lib/api";
import { formatDateTime, getTriggerTypeLabel, getWorkflowStatusLabel } from "../../lib/format";

export default async function WorkflowsPage() {
  const workflows = await getWorkflowTemplates();

  return (
    <AppShell activeNav="workflows" title="流程模板">
      <WorkspaceFrame>
        <ViewHeader
          eyebrow="流程模板"
          title="流程模板"
          description="维护可复用的智能体编排，保留证明链路入口。"
          actions={
            <Link href="/workflows/new" className="action-button">
              创建模板
            </Link>
          }
        />
        <div className="workflow-list-table">
          <DataList columns={["模板", "状态", "团队", "触发", "节点", "最近运行"]}>
            {workflows.length === 0 ? (
              <div className="empty-state">当前还没有流程模板。</div>
            ) : (
              workflows.map((workflow) => (
                <Link key={workflow.id} href={`/workflows/${workflow.id}`} className="data-list-link">
                  <div className="data-list-row">
                    <DataListCell tone="primary">
                      {workflow.name} · {workflow.version}
                    </DataListCell>
                    <DataListCell>
                      <span className="status-pill" data-tone={workflow.status}>
                        {getWorkflowStatusLabel(workflow.status)}
                      </span>
                    </DataListCell>
                    <DataListCell>{workflow.teamName ?? "工作区模板"}</DataListCell>
                    <DataListCell>{getTriggerTypeLabel(workflow.triggerType)}</DataListCell>
                    <DataListCell>{workflow.nodeCount}</DataListCell>
                    <DataListCell>{formatDateTime(workflow.lastTriggeredAt)}</DataListCell>
                  </div>
                </Link>
              ))
            )}
          </DataList>
        </div>
      </WorkspaceFrame>
    </AppShell>
  );
}
