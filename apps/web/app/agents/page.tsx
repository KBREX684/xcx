import Link from "next/link";
import { agentOperatingStates } from "@agent-control-plane/domain";
import { AppShell } from "../../components/app-shell";
import { AgentForm } from "../../components/agent-form";
import { ArrowRightIcon, PlusIcon } from "../../components/icons";
import { InspectorPane } from "../../components/inspector-pane";
import { getAgents, getTeams } from "../../lib/api";
import {
  formatPercent,
  getAgentOperatingStateLabel,
} from "../../lib/format";

function buildHref(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/agents?${qs}` : "/agents";
}

type SearchSP = {
  teamId?: string;
  state?: string;
};

export default async function AgentsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchSP>;
}) {
  const sp = (await searchParams) ?? {};
  const [agents, teams] = await Promise.all([getAgents(), getTeams()]);

  const filtered = agents.filter((agent) => {
    if (sp.teamId && !agent.boundTeams.some((team) => team.id === sp.teamId)) return false;
    if (sp.state && agent.operatingState !== sp.state) return false;
    return true;
  });

  const stateCounts = agents.reduce<Record<string, number>>(
    (accumulator, agent) => {
      accumulator[agent.operatingState] = (accumulator[agent.operatingState] ?? 0) + 1;
      return accumulator;
    },
    {},
  );

  const totalAgents = agents.length;
  const runningCount = stateCounts.running ?? 0;
  const reviewCount = stateCounts.waiting_review ?? 0;
  const offlineCount = (stateCounts.offline ?? 0) + (stateCounts.blocked ?? 0);
  const successRates = agents
    .map((agent) => agent.successRate)
    .filter((value): value is number => typeof value === "number");
  const avgSuccess =
    successRates.length > 0
      ? successRates.reduce((sum, value) => sum + value, 0) / successRates.length
      : null;

  return (
    <AppShell activeNav="agents" title="智能体">
      <div className="acp-list-shell">
        <header className="acp-list-head">
          <div className="acp-list-head__copy">
            <p className="acp-list-head__kicker">智能体目录</p>
            <h1 className="acp-list-head__title">智能体</h1>
            <p className="acp-list-head__description">
              管理可被 @ 派遣的智能体；按团队与运行态筛选，跟踪负载、成功率与证明状态。
            </p>
          </div>
          <div className="acp-list-head__actions">
            <details className="inline-disclosure inline-disclosure-compact">
              <summary className="inline-disclosure-trigger">
                <span className="inline-disclosure-trigger-copy">
                  <PlusIcon />
                  <span>创建智能体</span>
                </span>
              </summary>
              <div className="inline-disclosure-body">
                <InspectorPane title="创建智能体">
                  <AgentForm teams={teams} />
                </InspectorPane>
              </div>
            </details>
          </div>
        </header>

        <div className="metric-strip" aria-label="智能体概览">
          <div className="metric-strip__item">
            <span className="metric-strip__label">在册</span>
            <span className="metric-strip__value">{totalAgents}</span>
          </div>
          <div className="metric-strip__item">
            <span className="metric-strip__label">运行中</span>
            <span className="metric-strip__value metric-strip__value--accent">
              {runningCount}
            </span>
          </div>
          <div className="metric-strip__item">
            <span className="metric-strip__label">待审核</span>
            <span className="metric-strip__value metric-strip__value--warn">{reviewCount}</span>
          </div>
          <div className="metric-strip__item">
            <span className="metric-strip__label">平均成功率</span>
            <span className="metric-strip__value">{formatPercent(avgSuccess)}</span>
            <span className="metric-strip__hint">离线/阻塞 {offlineCount}</span>
          </div>
        </div>

        <section className="acp-surface">
          <div className="list-toolbar">
            <div className="list-toolbar__primary">
              <nav className="segmented-control" aria-label="按运行态筛选">
                <Link
                  href={buildHref({ teamId: sp.teamId })}
                  data-active={!sp.state ? "true" : undefined}
                  aria-current={!sp.state ? "page" : undefined}
                >
                  全部
                  <span className="segmented-count">{totalAgents}</span>
                </Link>
                {agentOperatingStates.map((state) => (
                  <Link
                    key={state}
                    href={buildHref({ teamId: sp.teamId, state })}
                    data-active={sp.state === state ? "true" : undefined}
                    aria-current={sp.state === state ? "page" : undefined}
                  >
                    {getAgentOperatingStateLabel(state)}
                    <span className="segmented-count">{stateCounts[state] ?? 0}</span>
                  </Link>
                ))}
              </nav>
            </div>
            {teams.length > 0 ? (
              <div className="list-toolbar__secondary" aria-label="按团队筛选">
                <span className="filter-chip-label">团队</span>
                <Link
                  href={buildHref({ state: sp.state })}
                  className="filter-chip"
                  data-active={!sp.teamId}
                >
                  全部
                </Link>
                {teams.map((team) => (
                  <Link
                    key={team.id}
                    href={buildHref({ teamId: team.id, state: sp.state })}
                    className="filter-chip"
                    data-active={sp.teamId === team.id}
                  >
                    {team.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className="agents-table" role="table">
            <div className="agents-table__head" role="row">
              <span>智能体</span>
              <span>运行态</span>
              <span>负载 / 待审</span>
              <span>成功率</span>
              <span>团队</span>
              <span>证明</span>
              <span aria-hidden="true" />
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                {agents.length === 0
                  ? "当前还没有智能体，点击右上角即可创建。"
                  : "无匹配的智能体，请调整筛选条件。"}
              </div>
            ) : (
              filtered.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="agents-table__row"
                  role="row"
                >
                  <div className="agents-table__name">
                    <span className="agents-table__name-line">
                      <span
                        className="state-dot"
                        data-state={agent.operatingState}
                        aria-hidden="true"
                      />
                      <span className="agents-table__name-strong">{agent.name}</span>
                    </span>
                    <span className="agents-table__role">{agent.roleName}</span>
                  </div>
                  <span className="agents-table__cell">
                    <span className="status-pill" data-tone={agent.operatingState}>
                      {getAgentOperatingStateLabel(agent.operatingState)}
                    </span>
                  </span>
                  <span className="agents-table__cell agents-table__cell--muted">
                    {agent.activeRunCount} / {agent.waitingReviewCount}
                  </span>
                  <span
                    className={`agents-table__cell${
                      typeof agent.successRate === "number" && agent.successRate >= 0.9
                        ? " agents-table__cell--success"
                        : ""
                    }`}
                  >
                    {formatPercent(agent.successRate)}
                  </span>
                  <span className="agents-table__cell agents-table__teams">
                    {agent.boundTeams.length > 0 ? (
                      agent.boundTeams.map((team) => (
                        <span key={team.id} className="team-tag">
                          {team.name}
                        </span>
                      ))
                    ) : (
                      <span className="agents-table__cell--muted">未绑定团队</span>
                    )}
                  </span>
                  <span
                    className="agents-table__proof"
                    data-on={agent.runCount > 0 ? "true" : undefined}
                  >
                    {agent.runCount > 0 ? "有记录" : "待执行"}
                  </span>
                  <span className="agents-table__arrow" aria-hidden="true">
                    <ArrowRightIcon />
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
