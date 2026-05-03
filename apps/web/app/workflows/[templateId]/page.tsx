import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { DataList, DataListCell } from "../../../components/data-list";
import { ViewHeader } from "../../../components/view-header";
import { WorkspaceFrame } from "../../../components/workspace-frame";
import { getWorkflowTemplate } from "../../../lib/api";
import {
  getNodeTypeLabel,
  getScenarioTypeLabel,
  getTriggerTypeLabel,
  getWorkflowStatusLabel,
} from "../../../lib/format";

type WorkflowDetailPageProps = {
  params: Promise<{ templateId: string }>;
  searchParams?: Promise<{ tab?: string | string[] }>;
};

type WorkflowDetailTab = "overview" | "nodes" | "settings";

const WORKFLOW_DETAIL_TABS: Array<{ key: WorkflowDetailTab; label: string }> = [
  { key: "overview", label: "总览" },
  { key: "nodes", label: "节点" },
  { key: "settings", label: "设置" },
];

function getWorkflowDetailTab(tab: string | string[] | undefined): WorkflowDetailTab {
  const value = Array.isArray(tab) ? tab[0] : tab;
  return WORKFLOW_DETAIL_TABS.some((item) => item.key === value)
    ? (value as WorkflowDetailTab)
    : "overview";
}

export default async function WorkflowDetailPage({
  params,
  searchParams,
}: WorkflowDetailPageProps) {
  const { templateId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = getWorkflowDetailTab(resolvedSearchParams.tab);
  const workflow = await getWorkflowTemplate(templateId).catch(() => null);

  if (!workflow) {
    notFound();
  }

  return (
    <AppShell
      activeNav="workflows"
      title="流程模板"
      breadcrumbs={[{ label: "流程模板", href: "/workflows" }, { label: workflow.name }]}
    >
      <WorkspaceFrame>
        <ViewHeader
          eyebrow="流程"
          title={workflow.name}
          description={getScenarioTypeLabel(workflow.scenarioType)}
          tabs={WORKFLOW_DETAIL_TABS.map((tab) => ({
            key: tab.key,
            label: tab.label,
            href:
              tab.key === "overview"
                ? `/workflows/${workflow.id}`
                : `/workflows/${workflow.id}?tab=${tab.key}`,
            active: activeTab === tab.key,
          }))}
          actions={
            <>
              <Link href="/workflows" className="ghost-button">
                返回流程模板
              </Link>
              <Link href={`/workflows/${workflow.id}/edit`} className="action-button">
                编辑模板
              </Link>
            </>
          }
        />

        {activeTab === "overview" ? (
          <div className="workflow-detail-tab">
            <div className="workflow-detail-summary">
              <div>
                <span>状态</span>
                <strong>{getWorkflowStatusLabel(workflow.status)}</strong>
              </div>
              <div>
                <span>版本</span>
                <strong>{workflow.version}</strong>
              </div>
              <div>
                <span>触发方式</span>
                <strong>{getTriggerTypeLabel(workflow.triggerType)}</strong>
              </div>
              <div>
                <span>累计使用</span>
                <strong>{workflow.usageCount}</strong>
              </div>
            </div>
            <section className="workflow-node-map">
              {workflow.nodes.map((node, index) => (
                <article key={node.key} className="workflow-node-map__item">
                  <span className="workflow-node-index">{index + 1}</span>
                  <div>
                    <strong>{node.name}</strong>
                    <p>
                      {getNodeTypeLabel(node.type)}
                      {node.boundAgentId ? ` · ${node.boundAgentId}` : ""}
                    </p>
                  </div>
                </article>
              ))}
            </section>
          </div>
        ) : null}

        {activeTab === "nodes" ? (
          <div className="workflow-list-table">
            <DataList columns={["节点", "类型", "智能体", "能力", "传输", "状态"]}>
              {workflow.nodes.map((node, index) => (
                <div key={node.key} className="data-list-row">
                  <DataListCell tone="primary">
                    {index + 1}. {node.name}
                  </DataListCell>
                  <DataListCell>{getNodeTypeLabel(node.type)}</DataListCell>
                  <DataListCell>{node.boundAgentId ?? "未绑定"}</DataListCell>
                  <DataListCell>{node.capabilityCode ?? "-"}</DataListCell>
                  <DataListCell>{node.transport ?? "-"}</DataListCell>
                  <DataListCell>
                    <span className="status-pill" data-tone={workflow.status}>
                      {getWorkflowStatusLabel(workflow.status)}
                    </span>
                  </DataListCell>
                </div>
              ))}
            </DataList>
          </div>
        ) : null}

        {activeTab === "settings" ? (
          <div className="workflow-settings-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow-text">模板属性</p>
                  <h3 className="panel-title">发布与触发设置</h3>
                </div>
              </div>
              <dl className="proof-meta">
                <div>
                  <dt>业务场景</dt>
                  <dd>{getScenarioTypeLabel(workflow.scenarioType)}</dd>
                </div>
                <div>
                  <dt>触发方式</dt>
                  <dd>{getTriggerTypeLabel(workflow.triggerType)}</dd>
                </div>
                <div>
                  <dt>模板状态</dt>
                  <dd>{getWorkflowStatusLabel(workflow.status)}</dd>
                </div>
                <div>
                  <dt>节点数量</dt>
                  <dd>{workflow.nodes.length}</dd>
                </div>
              </dl>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow-text">编辑</p>
                  <h3 className="panel-title">独立编辑页面</h3>
                </div>
              </div>
              <p className="supporting-text">
                编辑模板会进入独立页面，避免在详情页混合阅读、配置和发布操作。
              </p>
              <div className="workflow-builder-footer">
                <Link href={`/workflows/${workflow.id}/edit`} className="action-button">
                  编辑模板
                </Link>
              </div>
            </section>
          </div>
        ) : null}
      </WorkspaceFrame>
    </AppShell>
  );
}
