import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentForm } from "../../../components/agent-form";
import { AgentCapabilityPanel } from "../../../components/agent-capability-panel";
import { AppShell } from "../../../components/app-shell";
import { DataList, DataListCell } from "../../../components/data-list";
import { EvidenceDrawer } from "../../../components/evidence-drawer";
import { InspectorPane } from "../../../components/inspector-pane";
import { StatusPill } from "../../../components/status-pill";
import { ViewHeader } from "../../../components/view-header";
import { WorkspaceFrame } from "../../../components/workspace-frame";
import { getAgent, getEvidence, getTeams } from "../../../lib/api";
import {
  formatCurrencyCents,
  formatDateTime,
  formatPercent,
  formatRelativeTime,
  getAgentOperatingStateLabel,
  getAgentStatusLabel,
  getExecutorTypeLabel,
  getHealthStatusLabel,
} from "../../../lib/format";

type AgentDetailPageProps = {
  params: Promise<{ agentId: string }>;
};

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { agentId } = await params;
  const [agent, teams, evidence] = await Promise.all([
    getAgent(agentId).catch(() => null),
    getTeams(),
    getEvidence("agent", agentId).catch(() => null),
  ]);

  if (!agent) {
    notFound();
  }

  return (
    <AppShell
      activeNav="agents"
      title="智能体"
      breadcrumbs={[{ label: "智能体", href: "/agents" }, { label: agent.name }]}
    >
      <WorkspaceFrame>
        <ViewHeader
          eyebrow="智能体"
          title={agent.name}
          description={agent.description}
          actions={
            <Link href="/agents" className="ghost-button">
              返回智能体列表
            </Link>
          }
        />
        <div className="linear-workbench-grid">
          <section>
            <section className="metric-grid">
              <div className="metric-panel">
                <span className="metric-panel-label">运行态</span>
                <span className="metric-panel-value">
                  {getAgentOperatingStateLabel(agent.operatingState)}
                </span>
                <p className="metric-panel-note">配置态：{getAgentStatusLabel(agent.status)}</p>
              </div>
              <div className="metric-panel">
                <span className="metric-panel-label">当前负载</span>
                <span className="metric-panel-value">{agent.activeRunCount}</span>
                <p className="metric-panel-note">{agent.waitingReviewCount} 个执行等待审查</p>
              </div>
              <div className="metric-panel">
                <span className="metric-panel-label">成功率</span>
                <span className="metric-panel-value">{formatPercent(agent.successRate)}</span>
                <p className="metric-panel-note">基于最近可见执行结果</p>
              </div>
              <div className="metric-panel">
                <span className="metric-panel-label">成本估算</span>
                <span className="metric-panel-value">
                  {formatCurrencyCents(agent.estimatedCostCents)}
                </span>
                <p className="metric-panel-note">按执行次数粗略估算</p>
              </div>
            </section>

            <DataList columns={["运行", "状态", "任务", "追踪", "开始", "结束"]}>
              {agent.recentRuns.length === 0 ? (
                <div className="empty-state">这个智能体还没有运行记录。</div>
              ) : (
                agent.recentRuns.map((run) => (
                  <Link key={run.id} href={`/runs/${run.id}`} className="data-list-link">
                    <div className="data-list-row">
                      <DataListCell tone="primary">{run.agentName}</DataListCell>
                      <DataListCell>
                        <StatusPill status={run.status} />
                      </DataListCell>
                      <DataListCell>{run.taskTitle}</DataListCell>
                      <DataListCell>{run.traceId.slice(0, 10)}</DataListCell>
                      <DataListCell>{formatDateTime(run.startedAt ?? run.createdAt)}</DataListCell>
                      <DataListCell>{formatDateTime(run.finishedAt)}</DataListCell>
                    </div>
                  </Link>
                ))
              )}
            </DataList>

            <section className="panel">
              <div className="panel-heading">
                <h3 className="panel-title">最近 Session</h3>
              </div>
              <div className="list-stack">
                {agent.recentSessions.length === 0 ? (
                  <div className="empty-state">暂无可观察 Session。</div>
                ) : (
                  agent.recentSessions.map((session) => (
                    <article key={session.id} className="list-card">
                      <div className="list-card-head">
                        <strong>{session.prompt}</strong>
                        <StatusPill status={session.status} />
                      </div>
                      <p className="supporting-text">
                        {session.activitySummary ??
                          session.planSummary ??
                          session.awaitingInputReason ??
                          "暂无活动摘要"}
                      </p>
                      <p className="supporting-text">
                        最近活动：
                        {formatRelativeTime(session.lastActivityAt ?? session.updatedAt)}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h3 className="panel-title">最近派遣与提及</h3>
              </div>
              <div className="list-stack">
                {agent.queuedAssignments.map((assignment) => (
                  <article key={assignment.id} className="list-card">
                    <strong>{assignment.taskTitle}</strong>
                    <p className="supporting-text">
                      {assignment.projectName} · {formatRelativeTime(assignment.assignedAt)}
                    </p>
                  </article>
                ))}
                {agent.recentMentions.map((message) => (
                  <article key={message.id} className="list-card">
                    <strong>@ 提及</strong>
                    <p className="supporting-text">{message.body}</p>
                  </article>
                ))}
                {agent.queuedAssignments.length === 0 && agent.recentMentions.length === 0 ? (
                  <div className="empty-state">暂无派遣或提及记录。</div>
                ) : null}
              </div>
            </section>
          </section>

          <InspectorPane title="智能体设置">
            <div className="meta-column">
              <span>运行态：{getAgentOperatingStateLabel(agent.operatingState)}</span>
              <span>状态：{getAgentStatusLabel(agent.status)}</span>
              <span>传输：{getExecutorTypeLabel(agent.transport)}</span>
              <span>健康：{getHealthStatusLabel(agent.healthStatus)}</span>
              <span>团队：{agent.boundTeams.map((team) => team.name).join(" / ") || "未绑定"}</span>
            </div>
            <AgentForm agent={agent} teams={teams} />
            <AgentCapabilityPanel
              agentId={agent.id}
              authorizations={agent.capabilityAuthorizations}
              signingKey={agent.signingKey}
              returnPath={`/agents/${agent.id}`}
            />
            {evidence ? <EvidenceDrawer evidence={evidence} /> : null}
          </InspectorPane>
        </div>
      </WorkspaceFrame>
    </AppShell>
  );
}
