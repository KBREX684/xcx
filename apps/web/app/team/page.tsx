import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { StatusPill } from "../../components/status-pill";
import { getAgents, getDashboardSummary, getIntegrationConfig } from "../../lib/api";
import { getApprovalModeLabel, getExecutorTypeLabel, getNotificationChannelLabel } from "../../lib/format";

export default async function TeamPage() {
  const [dashboard, agents, integration] = await Promise.all([
    getDashboardSummary(),
    getAgents(),
    getIntegrationConfig()
  ]);

  const activeAgents = agents.filter((item) => item.status === "active").length;

  return (
    <AppShell
      activeNav="team"
      navBadges={{ messages: dashboard.pendingApprovalCount }}
      title="团队"
      description="查看团队概览，并继续进入智能体与连接配置。"
      breadcrumbs={[{ label: "团队" }]}
    >
      <section className="metrics-grid">
        <article className="metric-card">
          <div className="metric-label">团队智能体</div>
          <div className="metric-value">{agents.length}</div>
          <p className="metric-note">活跃 {activeAgents} · 总执行记录 {agents.reduce((sum, item) => sum + item.runCount, 0)}</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">运行中执行</div>
          <div className="metric-value">{dashboard.runningExecutionCount}</div>
          <p className="metric-note">当前正在推进的自动化执行项</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">审批模式</div>
          <div className="metric-value metric-value-text">{getApprovalModeLabel(integration.approvalMode)}</div>
          <p className="metric-note">用于控制人工审批的介入策略</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">通知通道</div>
          <div className="metric-value metric-value-text">{getNotificationChannelLabel(integration.notificationChannel)}</div>
          <p className="metric-note">当前消息推送与提醒渠道</p>
        </article>
      </section>

      <section className="content-grid">
        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">智能体概览</p>
                <h3 className="panel-title">团队中的执行角色</h3>
              </div>
              <Link href="/agents" className="inline-link">
                查看全部智能体
              </Link>
            </div>
            {agents.length === 0 ? (
              <div className="empty-state">当前团队还没有智能体，先在配置页建立连接后再补充角色。</div>
            ) : (
              <div className="list-stack">
                {agents.slice(0, 5).map((agent) => (
                  <article key={agent.id} className="list-card">
                    <div className="list-card-head">
                      <div>
                        <h4 className="list-card-title">{agent.name}</h4>
                        <p className="supporting-text">{agent.roleName}</p>
                      </div>
                      <StatusPill status={agent.status} />
                    </div>
                    <div className="meta-row">
                      <span>适配器 {getExecutorTypeLabel(agent.adapterType)}</span>
                      <span>任务 {agent.taskCount}</span>
                      <span>执行 {agent.runCount}</span>
                    </div>
                    <div className="link-row">
                      <Link href={`/agents/${agent.id}`} className="inline-link">
                        查看详情
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">连接配置</p>
                <h3 className="panel-title">API / MCP / 回调</h3>
              </div>
              <Link href="/settings/integrations" className="inline-link">
                打开配置页
              </Link>
            </div>
            <div className="meta-column">
              <span>默认执行器：{getExecutorTypeLabel(integration.defaultExecutorType)}</span>
              <span>通知通道：{getNotificationChannelLabel(integration.notificationChannel)}</span>
              <span>审批模式：{getApprovalModeLabel(integration.approvalMode)}</span>
              <span>回调地址：{integration.callbackBaseUrl ?? "未配置"}</span>
              <span>Agent 端点：{integration.agentEndpoint ?? "未配置"}</span>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">团队建议</p>
                <h3 className="panel-title">下一步优化</h3>
              </div>
            </div>
            <div className="compact-stack">
              <div className="soft-note">建议把高频任务绑定固定智能体角色，减少执行分配波动。</div>
              <div className="soft-note">建议保持通知通道与审批模式一致，避免消息触达与流程决策脱节。</div>
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
