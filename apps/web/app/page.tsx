import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { CreateProjectForm } from "../components/create-project-form";
import { StatusPill } from "../components/status-pill";
import { getDashboardSummary } from "../lib/api";
import { formatDateTime, shortTrace } from "../lib/format";

export default async function HomePage() {
  const dashboard = await getDashboardSummary();

  return (
    <AppShell
      activeNav="dashboard"
      title="工作台总览"
      description={`欢迎回到 ${dashboard.workspaceName}，这里聚合了项目推进、待审批事项、执行活动与证明书线索。`}
    >
      <section className="hero-grid">
        <article className="hero-panel">
          <div className="hero-kicker">本轮控制面升级</div>
          <h2 className="hero-title">让智能代理的交付过程持续可见、可控、可追踪。</h2>
          <p className="hero-copy">
            我们把 P1 的单页演示，升级成全中文、双主题、低疲劳的日常工作控制台。你可以从这里进入项目、
            审批、流程模板、执行代理与证明书中心，形成一条真正可运营的闭环。
          </p>
          <div className="hero-rail">
            <div className="hero-stat">
              <div className="hero-stat-label">进行中项目</div>
              <div className="hero-stat-value">{dashboard.activeProjectCount}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">待审批事项</div>
              <div className="hero-stat-value">{dashboard.pendingApprovalCount}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">在线执行代理</div>
              <div className="hero-stat-value">{dashboard.activeAgentCount}</div>
            </div>
          </div>
          <div className="link-row">
            <Link href="/projects" className="action-button">
              进入项目总览
            </Link>
            <Link href="/approvals" className="ghost-link">
              打开审批中心
            </Link>
          </div>
        </article>

        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">快捷入口</p>
                <h3 className="panel-title">今天从哪里开始</h3>
              </div>
            </div>
            <div className="list-stack">
              <Link className="list-card" href="/projects">
                <div className="list-card-head">
                  <h4 className="list-card-title">项目总览</h4>
                </div>
                <p className="supporting-text">查看所有项目、状态筛选和交付节奏。</p>
              </Link>
              <Link className="list-card" href="/approvals">
                <div className="list-card-head">
                  <h4 className="list-card-title">审批中心</h4>
                </div>
                <p className="supporting-text">处理待审批执行记录，并查看审批历史。</p>
              </Link>
              <Link className="list-card" href="/settings/integrations">
                <div className="list-card-head">
                  <h4 className="list-card-title">接入配置</h4>
                </div>
                <p className="supporting-text">维护执行器、通知与回调的基础设置。</p>
              </Link>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">证明书线索</p>
                <h3 className="panel-title">最近更新</h3>
              </div>
            </div>
            {dashboard.certificateHighlights.length === 0 ? (
              <div className="empty-state">当前还没有证明书摘要，触发一次流程并完成审批后就会逐步沉淀。</div>
            ) : (
              <div className="list-stack">
                {dashboard.certificateHighlights.map((certificate) => (
                  <article key={certificate.id} className="list-card">
                    <div className="list-card-head">
                      <h4 className="list-card-title">{certificate.title}</h4>
                      <StatusPill status={certificate.status} />
                    </div>
                    <div className="meta-row">
                      <span>{certificate.projectName}</span>
                      <span>核验码 {certificate.verificationCode}</span>
                    </div>
                    <p className="supporting-text">最近更新于 {formatDateTime(certificate.updatedAt)}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <div className="metric-label">项目总数</div>
          <div className="metric-value">{dashboard.totalProjectCount}</div>
          <p className="metric-note">包含当前所有草稿、进行中与已交付项目。</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">正在执行</div>
          <div className="metric-value">{dashboard.runningExecutionCount}</div>
          <p className="metric-note">当前处于运行态的执行记录数量。</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">待审批</div>
          <div className="metric-value">{dashboard.pendingApprovalCount}</div>
          <p className="metric-note">需要人工介入决策的执行项，建议优先处理。</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">活跃代理</div>
          <div className="metric-value">{dashboard.activeAgentCount}</div>
          <p className="metric-note">当前可接单、可执行的智能代理角色数量。</p>
        </article>
      </section>

      <section className="content-grid">
        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">活跃项目</p>
                <h3 className="panel-title">值得优先关注的项目</h3>
              </div>
              <Link href="/projects" className="ghost-link">
                查看全部
              </Link>
            </div>
            {dashboard.spotlightProjects.length === 0 ? (
              <div className="empty-state">还没有项目，先在右侧创建一个新的交付项目。</div>
            ) : (
              <div className="cards-grid">
                {dashboard.spotlightProjects.map((project) => (
                  <article key={project.id} className="card-panel">
                    <div className="list-card-head">
                      <div>
                        <p className="eyebrow-text">{project.projectCode}</p>
                        <h4 className="list-card-title">{project.name}</h4>
                      </div>
                      <StatusPill status={project.latestRunStatus ?? project.status} />
                    </div>
                    <p className="supporting-text">客户：{project.customerName}</p>
                    <div className="meta-row">
                      <span>任务 {project.taskCount}</span>
                      <span>已完成 {project.completedTaskCount}</span>
                      <span>待审批 {project.pendingApprovalCount}</span>
                    </div>
                    <div className="link-row">
                      <Link href={`/projects/${project.id}`} className="inline-link">
                        进入项目指挥台
                      </Link>
                      <Link href={`/projects/${project.id}/settings`} className="inline-link">
                        项目设置
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">最近事件</p>
                <h3 className="panel-title">控制面时间线</h3>
              </div>
            </div>
            {dashboard.recentEvents.length === 0 ? (
              <div className="empty-state">还没有事件记录，项目创建、流程触发和审批都会出现在这里。</div>
            ) : (
              <div className="timeline-list">
                {dashboard.recentEvents.map((event) => (
                  <article key={event.id} className="timeline-item">
                    <strong>{event.summary}</strong>
                    <div className="timeline-meta">
                      <span>追踪标识 {shortTrace(event.traceId, 10)}</span>
                      <span>{formatDateTime(event.occurredAt)}</span>
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
                <p className="eyebrow-text">待审批</p>
                <h3 className="panel-title">当前阻塞点</h3>
              </div>
            </div>
            {dashboard.pendingApprovals.length === 0 ? (
              <div className="empty-state">当前没有待审批项，系统处于比较顺畅的运行状态。</div>
            ) : (
              <div className="list-stack">
                {dashboard.pendingApprovals.map((item) => (
                  <Link key={item.runId} href={`/runs/${item.runId}`} className="list-card">
                    <div className="list-card-head">
                      <h4 className="list-card-title">{item.taskTitle}</h4>
                      <StatusPill status="waiting_approval" />
                    </div>
                    <p className="supporting-text">
                      {item.projectName} · 由 {item.agentName} 推进
                    </p>
                    <div className="timeline-meta">
                      <span>提交于 {formatDateTime(item.requestedAt)}</span>
                      <span>追踪标识 {shortTrace(item.traceId, 10)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">新建项目</p>
                <h3 className="panel-title">开启新的交付闭环</h3>
              </div>
            </div>
            <div className="embedded-form">
              <CreateProjectForm />
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
