import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { StatusPill } from "../../components/status-pill";
import { getAgents } from "../../lib/api";
import { formatDateTime, getExecutorTypeLabel, getHealthStatusLabel } from "../../lib/format";

export default async function AgentsPage() {
  const agents = await getAgents();

  return (
    <AppShell
      activeNav="agents"
      title="执行代理"
      description="查看执行代理的角色定位、健康状态、任务承载量和最近执行情况。"
      breadcrumbs={[{ label: "执行代理" }]}
    >
      <section className="cards-grid">
        {agents.map((agent) => (
          <article key={agent.id} className="card-panel">
            <div className="list-card-head">
              <div>
                <p className="eyebrow-text">{agent.roleName}</p>
                <h3 className="list-card-title">{agent.name}</h3>
              </div>
              <StatusPill status={agent.status} />
            </div>
            <p className="supporting-text">{agent.description}</p>
            <div className="meta-column">
              <span>适配器：{getExecutorTypeLabel(agent.adapterType)}</span>
              <span>健康度：{getHealthStatusLabel(agent.healthStatus)}</span>
              <span>最近活跃：{formatDateTime(agent.lastSeenAt)}</span>
            </div>
            <div className="meta-row">
              <span>任务 {agent.taskCount}</span>
              <span>执行记录 {agent.runCount}</span>
            </div>
            <div className="link-row">
              <Link href={`/agents/${agent.id}`} className="inline-link">
                查看代理详情
              </Link>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
