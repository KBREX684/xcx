import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { StatusPill } from "../../../components/status-pill";
import { getWorkflowTemplate } from "../../../lib/api";
import { formatDateTime, getNodeTypeLabel, getScenarioTypeLabel, getTriggerTypeLabel } from "../../../lib/format";

type WorkflowDetailPageProps = {
  params: Promise<{
    templateId: string;
  }>;
};

export default async function WorkflowDetailPage({ params }: WorkflowDetailPageProps) {
  const { templateId } = await params;
  const workflow = await getWorkflowTemplate(templateId).catch(() => null);

  if (!workflow) {
    notFound();
  }

  return (
    <AppShell
      activeNav="workflows"
      title={workflow.name}
      description="流程模板详情页，查看当前内置流程的版本、场景归属与节点构成。"
      breadcrumbs={[
        { label: "流程模板", href: "/workflows" },
        { label: workflow.name }
      ]}
    >
      <section className="metrics-grid">
        <article className="metric-card">
          <div className="metric-label">模板状态</div>
          <div className="metric-value-row">
            <StatusPill status={workflow.status} />
          </div>
          <p className="metric-note">场景：{getScenarioTypeLabel(workflow.scenarioType)}</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">触发方式</div>
          <div className="metric-value metric-value-text">{getTriggerTypeLabel(workflow.triggerType)}</div>
          <p className="metric-note">最近触发：{formatDateTime(workflow.lastTriggeredAt)}</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">版本</div>
          <div className="metric-value metric-value-text">{workflow.version}</div>
          <p className="metric-note">P2 仍以单模板为中心验证闭环。</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">累计使用</div>
          <div className="metric-value">{workflow.usageCount}</div>
          <p className="metric-note">这是当前模板被触发的累计次数。</p>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow-text">节点结构</p>
            <h3 className="panel-title">当前模板共 {workflow.nodes.length} 个节点</h3>
          </div>
        </div>
        <div className="cards-grid">
          {workflow.nodes.map((node, index) => (
            <article key={node.key} className="card-panel">
              <p className="eyebrow-text">
                节点 {index + 1} · {getNodeTypeLabel(node.type)}
              </p>
              <h4 className="list-card-title">{node.name}</h4>
              <div className="meta-column">
                <span>节点标识：{node.key}</span>
                <span>节点类型：{getNodeTypeLabel(node.type)}</span>
                <span>{node.boundAgentId ? `绑定代理：${node.boundAgentId}` : "当前没有绑定代理"}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
