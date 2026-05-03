import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { ArrowRightIcon, PlusIcon } from "../../components/icons";
import { CreateTeamForm } from "../../components/create-team-form";
import { getAgents, getDashboardSummary, getTeams } from "../../lib/api";
import { formatRelativeTime } from "../../lib/format";

export default async function TeamPage() {
  const [dashboard, teams, agents] = await Promise.all([
    getDashboardSummary(),
    getTeams(),
    getAgents(),
  ]);

  const agentOptions = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    roleName: agent.roleName,
  }));

  return (
    <AppShell activeNav="team" navBadges={{ messages: dashboard.pendingApprovalCount }} title="团队">
      <section className="projects-workspace">
        <header className="projects-workspace-head">
          <div className="projects-workspace-copy">
            <p className="workspace-kicker">团队</p>
            <h2 className="workspace-title">团队列表</h2>
          </div>
        </header>

        <details className="inline-disclosure team-create-panel" open>
          <summary className="inline-disclosure-trigger team-create-trigger">
            <span className="inline-disclosure-trigger-copy">
              <PlusIcon />
              <span>新建团队</span>
            </span>
          </summary>
          <div className="inline-disclosure-body team-create-body">
            <CreateTeamForm agents={agentOptions} />
          </div>
        </details>

        <section className="projects-surface">
          <div className="projects-table team-table">
            <div className="projects-table-head">
              <span>团队</span>
              <span>绑定智能体</span>
              <span>关联项目</span>
              <span>运行中执行</span>
              <span>最近更新</span>
              <span aria-hidden="true" />
            </div>

            {teams.length === 0 ? (
              <div className="empty-state">
                当前还没有团队。先创建一个团队，再把智能体绑定进去。
              </div>
            ) : (
              <div className="projects-table-body">
                {teams.map((team) => (
                  <Link key={team.id} href={`/team/${team.id}`} className="projects-row">
                    <div className="projects-row-main">
                      <div className="projects-row-titleline">
                        <h3 className="projects-row-title">{team.name}</h3>
                        <span className="projects-row-code">{team.slug}</span>
                      </div>
                      <p className="projects-row-meta">
                        {team.description?.trim() ||
                          "用于承接特定交付阶段、场景或协作职责。"}
                      </p>
                    </div>
                    <div className="projects-row-cell projects-row-secondary">
                      {team.agentCount} 名
                      <br />
                      活跃 {team.activeAgentCount}
                    </div>
                    <div className="projects-row-cell projects-row-secondary">
                      {team.projectCount}
                    </div>
                    <div className="projects-row-cell projects-row-secondary">
                      {team.runningExecutionCount}
                    </div>
                    <div className="projects-row-cell projects-row-secondary">
                      {formatRelativeTime(team.updatedAt)}
                    </div>
                    <div className="projects-row-arrow" aria-hidden="true">
                      <ArrowRightIcon />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
