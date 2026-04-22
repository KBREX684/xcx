import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { StatusPill } from "../../components/status-pill";
import { getWorkflowTemplates } from "../../lib/api";
import { formatDateTime, getScenarioTypeLabel, getTriggerTypeLabel } from "../../lib/format";

export default async function WorkflowsPage() {
  const workflows = await getWorkflowTemplates();

  return (
    <AppShell
      activeNav="workflows"
      title="流程模板"
      description="查看模板定义、使用频次与节点结构，为后续接入更多流程场景做准备。"
      breadcrumbs={[{ label: "流程模板" }]}
    >
      <section className="cards-grid">
        {workflows.map((workflow) => (
          <article key={workflow.id} className="card-panel">
            <div className="list-card-head">
              <div>
                <p className="eyebrow-text">{getScenarioTypeLabel(workflow.scenarioType)}</p>
                <h3 className="list-card-title">{workflow.name}</h3>
              </div>
              <StatusPill status={workflow.status} />
            </div>
            <div className="meta-column">
              <span>版本：{workflow.version}</span>
              <span>触发方式：{getTriggerTypeLabel(workflow.triggerType)}</span>
              <span>节点数量：{workflow.nodeCount}</span>
              <span>最近触发：{formatDateTime(workflow.lastTriggeredAt)}</span>
            </div>
            <p className="supporting-text">累计使用 {workflow.usageCount} 次，可继续扩展为更多交付流程场景。</p>
            <div className="link-row">
              <Link href={`/workflows/${workflow.id}`} className="inline-link">
                查看模板详情
              </Link>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
