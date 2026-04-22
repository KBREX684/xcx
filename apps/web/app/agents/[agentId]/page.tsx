import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { StatusPill } from "../../../components/status-pill";
import { getAgent } from "../../../lib/api";
import { formatDateTime, getExecutorTypeLabel, getHealthStatusLabel } from "../../../lib/format";

type AgentDetailPageProps = {
  params: Promise<{
    agentId: string;
  }>;
};

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { agentId } = await params;
  const agent = await getAgent(agentId).catch(() => null);

  if (!agent) {
    notFound();
  }

  return (
    <AppShell
      activeNav="agents"
      title={agent.name}
      description="执行代理详情页，聚焦角色定位、健康度、近期执行记录与承接中的任务。"
      breadcrumbs={[
        { label: "执行代理", href: "/agents" },
        { label: agent.name }
      ]}
    >
      <section className="metrics-grid">
        <article className="metric-card">
          <div className="metric-label">状态</div>
          <div className="metric-value-row">
            <StatusPill status={agent.status} />
          </div>
          <p className="metric-note">健康度：{getHealthStatusLabel(agent.healthStatus)}</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">适配器</div>
          <div className="metric-value metric-value-text">{getExecutorTypeLabel(agent.adapterType)}</div>
          <p className="metric-note">最近活跃：{formatDateTime(agent.lastSeenAt)}</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">承接任务</div>
          <div className="metric-value">{agent.taskCount}</div>
          <p className="metric-note">当前归属给该代理的任务数。</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">执行记录</div>
          <div className="metric-value">{agent.runCount}</div>
          <p className="metric-note">历史累计产生的执行记录数量。</p>
        </article>
      </section>

      <section className="content-grid">
        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">角色说明</p>
                <h3 className="panel-title">职责与标签</h3>
              </div>
            </div>
            <p className="supporting-text">{agent.description}</p>
            {agent.tags.length > 0 ? (
              <div className="tag-row">
                {agent.tags.map((tag) => (
                  <span key={tag} className="tag-chip">
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <div className="soft-note">当前没有附加标签，这个代理仍以角色名和描述为主要识别信息。</div>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">最近执行</p>
                <h3 className="panel-title">执行记录列表</h3>
              </div>
            </div>
            {agent.recentRuns.length === 0 ? (
              <div className="empty-state">这个代理还没有执行记录，说明它还没真正参与过流程推进。</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>任务</th>
                      <th>状态</th>
                      <th>开始时间</th>
                      <th>完成时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agent.recentRuns.map((run) => (
                      <tr key={run.id}>
                        <td>
                          <Link href={`/runs/${run.id}`} className="table-link">
                            {run.taskTitle}
                          </Link>
                        </td>
                        <td>
                          <StatusPill status={run.status} />
                        </td>
                        <td>{formatDateTime(run.startedAt ?? run.createdAt)}</td>
                        <td>{formatDateTime(run.finishedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">承接任务</p>
                <h3 className="panel-title">当前归属列表</h3>
              </div>
            </div>
            {agent.ownedTasks.length === 0 ? (
              <div className="empty-state">当前没有任务归属于这个代理，它处于待命状态。</div>
            ) : (
              <div className="list-stack">
                {agent.ownedTasks.map((task) => (
                  <article key={task.id} className="list-card">
                    <div className="list-card-head">
                      <h4 className="list-card-title">{task.title}</h4>
                      <StatusPill status={task.currentRunStatus ?? task.status} />
                    </div>
                    <p className="supporting-text">{task.description}</p>
                    <div className="meta-row">
                      <span>优先级 {task.priority}</span>
                      <span>负责人 {task.ownerLabel}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </AppShell>
  );
}
