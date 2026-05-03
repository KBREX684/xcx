import Link from "next/link";
import { getStatusLabel } from "@agent-control-plane/domain";
import { createCycleAction } from "../../actions";
import { AppShell } from "../../../components/app-shell";
import { DataList, DataListCell } from "../../../components/data-list";
import { InspectorPane } from "../../../components/inspector-pane";
import { StatusPill } from "../../../components/status-pill";
import { TeamSettingsForm } from "../../../components/team-settings-form";
import { ViewHeader } from "../../../components/view-header";
import { WorkspaceFrame } from "../../../components/workspace-frame";
import { getAgents, getDashboardSummary, getTeam } from "../../../lib/api";
import {
  formatRelativeTime,
  getExecutorTypeLabel,
  getHealthStatusLabel,
} from "../../../lib/format";

type TeamDetailPageProps = {
  params: Promise<{ teamId: string }>;
};

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { teamId } = await params;
  const [dashboard, team, agents] = await Promise.all([
    getDashboardSummary(),
    getTeam(teamId),
    getAgents(),
  ]);

  return (
    <AppShell
      activeNav="team"
      navBadges={{ messages: dashboard.pendingApprovalCount }}
      title="团队"
      breadcrumbs={[{ label: "团队", href: "/team" }, { label: team.name }]}
    >
      <WorkspaceFrame>
        <ViewHeader
          eyebrow="团队"
          title={team.name}
          description={team.description ?? "团队是事项、流程模板、智能体指引与证明边界。"}
          actions={
            <Link href="/team" className="ghost-button">
              返回团队列表
            </Link>
          }
          tabs={[
            { label: "事项", href: `/team/${team.id}/issues` },
            { label: "分拣", href: `/team/${team.id}/triage` },
            { label: "进行中", href: `/team/${team.id}/active` },
            { label: "待排期", href: `/team/${team.id}/backlog` },
          ]}
        />
        <div className="linear-workbench-grid">
          <section className="stack-panel">
            <DataList columns={["项目", "状态", "编号", "更新", "打开", "证明"]}>
              {team.projects.length === 0 ? (
                <div className="empty-state">这个团队还没有绑定项目。</div>
              ) : (
                team.projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="data-list-link"
                  >
                    <div className="data-list-row">
                      <DataListCell tone="primary">{project.name}</DataListCell>
                      <DataListCell>
                        <StatusPill status={project.status} />
                      </DataListCell>
                      <DataListCell>{project.projectCode}</DataListCell>
                      <DataListCell>{formatRelativeTime(project.lastEventAt)}</DataListCell>
                      <DataListCell>打开</DataListCell>
                      <DataListCell tone="proof">项目链路</DataListCell>
                    </div>
                  </Link>
                ))
              )}
            </DataList>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow-text">智能体</p>
                  <h3 className="panel-title">团队执行角色</h3>
                </div>
              </div>
              {team.bindings.length === 0 ? (
                <div className="empty-state">当前没有绑定 Agent。</div>
              ) : (
                <div className="list-stack">
                  {team.bindings.map((binding) => (
                    <Link
                      key={binding.agentId}
                      href={`/agents/${binding.agentId}`}
                      className="list-card list-card-link"
                    >
                      <div className="list-card-head">
                        <div>
                          <h4 className="list-card-title">{binding.agentName}</h4>
                          <p className="supporting-text">{binding.roleName}</p>
                        </div>
                        <StatusPill status={binding.status} />
                      </div>
                      <div className="meta-row">
                        <span>{getExecutorTypeLabel(binding.transport)}</span>
                        <span>{getHealthStatusLabel(binding.healthStatus)}</span>
                        <span>{binding.capabilities.join(" / ") || "未声明能力"}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow-text">周期</p>
                  <h3 className="panel-title">团队排期</h3>
                </div>
              </div>
              {team.cycles.length === 0 ? (
                <div className="empty-state">暂无周期。创建后即可把事项拖入团队排期。</div>
              ) : (
                <div className="list-stack">
                  {team.cycles.map((cycle) => (
                    <article key={cycle.id} className="list-card">
                      <div className="list-card-head">
                        <div>
                          <h4 className="list-card-title">{cycle.name}</h4>
                          <p className="supporting-text">
                            {new Date(cycle.startsAt).toLocaleDateString("zh-CN")} -{" "}
                            {new Date(cycle.endsAt).toLocaleDateString("zh-CN")} · 事项{" "}
                            {cycle.issueCount}
                          </p>
                        </div>
                        <StatusPill status={cycle.status} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>

          <InspectorPane title="团队配置">
            <div className="meta-column">
              <span>分拣：{team.triageEnabled ? "开启" : "关闭"}</span>
              <span>事项状态：{team.issueStatuses.map(getStatusLabel).join(" / ") || "默认"}</span>
              <span>绑定智能体：{team.agentCount}</span>
              <span>关联项目：{team.projectCount}</span>
              <span>运行中：{team.runningExecutionCount}</span>
              <span>最近更新：{formatRelativeTime(team.updatedAt)}</span>
            </div>
            {team.agentGuidance ? <p className="soft-note">{team.agentGuidance}</p> : null}
            <form action={createCycleAction} className="form-stack">
              <input type="hidden" name="teamId" value={team.id} />
              <input type="hidden" name="returnPath" value={`/team/${team.id}`} />
              <label className="field-label">
                新周期名称
                <input className="field-control" name="name" placeholder="例如：第 1 周交付周期" />
              </label>
              <div className="grid-two">
                <label className="field-label">
                  开始
                  <input className="field-control" name="startsAt" type="datetime-local" />
                </label>
                <label className="field-label">
                  结束
                  <input className="field-control" name="endsAt" type="datetime-local" />
                </label>
              </div>
              <button type="submit" className="secondary-action">
                创建周期
              </button>
            </form>
            <TeamSettingsForm
              teamId={team.id}
              name={team.name}
              description={team.description}
              triageEnabled={team.triageEnabled}
              issueStatuses={team.issueStatuses}
              agentGuidance={team.agentGuidance}
              selectedAgentIds={team.bindings.map((binding) => binding.agentId)}
              agents={agents.map((agent) => ({
                id: agent.id,
                name: agent.name,
                roleName: agent.roleName,
              }))}
            />
          </InspectorPane>
        </div>
      </WorkspaceFrame>
    </AppShell>
  );
}
